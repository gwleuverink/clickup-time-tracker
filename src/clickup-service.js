import request from "request";
import store from "@/store";
import cache from "@/cache";

const BASE_URL = "https://api.clickup.com/api/v2";
const TASKS_CACHE_KEY = "tasks";
const USERS_CACHE_KEY = "users";

function teamRootUrl() {
  return `${BASE_URL}/team/${store.get("settings.clickup_team_id")}`;
}

export default {
  /*
   * Retrieves a page of tasks from the ClickUp API
   */
  tokenValid(token) {
    return new Promise((resolve, reject) => {
      request(
        {
          method: "GET",
          mode: "no-cors",
          url: BASE_URL + "/user",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        },
        (error, response) => {
          if (error) return reject(error);

          const user = JSON.parse(response.body).user;

          if (!user) reject("Invalid response");

          resolve(true);
        }
      );
    });
  },

  /*
   * Get all time tracking entries within a given range
   */
  getTimeTrackingRange(start, end, userId) {
    return new Promise((resolve, reject) => {
      const params = {
        start_date: start.valueOf(),
        end_date: end.valueOf(),
      };

      // Only set assignee when argument was given
      if (userId) {
        params.assignee = userId;
      }

      request(
        {
          method: "GET",
          mode: "no-cors",
          url: `${teamRootUrl()}/time_entries?` + new URLSearchParams(params),

          headers: {
            Authorization: store.get("settings.clickup_access_token"),
            "Content-Type": "application/json",
          },
        },
        (error, response) => {
          if (error) return reject(error);
          const body = JSON.parse(response.body);

          if (body.err) {
            // This friggin api... return a decent response code for fuck sake
            reject(body.err);
          }
          resolve(body.data || []);
        }
      );
    });
  },

  /*
   * Retrieves a page of tasks from the ClickUp API
   */
  getTasksPage(page) {
    page = page || 0;

    return new Promise((resolve, reject) => {
      request(
        {
          method: "GET",
          mode: "no-cors",
          url:
            `${teamRootUrl()}/task?` +
            new URLSearchParams({
              page: page,
              archived: false,
              include_closed: false,
            }),

          headers: {
            Authorization: store.get("settings.clickup_access_token"),
            "Content-Type": "application/json",
          },
        },
        (error, response) => {
          if (error) return reject(error);

          resolve(JSON.parse(response.body).tasks || []);
        }
      );
    });
  },

  /*
   * Get all tasks. Iterated over a paginated list in order to fetch them all.
   * This might take a while
   */
  async getTasks() {
    let page = 0;
    let results = [];

    do {
      try {
        results = await results.concat(await this.getTasksPage(page));
        page++;
      } catch (e) {
        console.log(`Error retrieving tasks page ${page}. Retrying...`, e);
      }
    } while (results.length / page === 100);

    return results;
  },

  /**
   *
   * @returns
   */
  async getSpaceTags() {
    return await new Promise((resolve, reject) => {
      request(
        {
          method: "GET",
          mode: "no-cors",
          url: `${teamRootUrl()}/time_entries/tags`,
          headers: {
            Authorization: store.get("settings.clickup_access_token"),
            "Content-Type": "application/json",
          },
        },
        (error, response) => {
          if (error) return reject(error);
          resolve(JSON.parse(response.body).data || []);
        }
      );
    });
  },

  async getCachedTasks() {
    const cached = cache.get(TASKS_CACHE_KEY);

    if (cached) {
      return cached;
    }

    // Fetch a fresh tasklist
    let tasks = await this.getTasks();

    // Only keep the data we care about
    tasks = tasks.map((task) => ({
      id: task.id,
      name: `${task.name}`,
      folder: `${task.folder.name}`,
    }));

    return cache.put(
      TASKS_CACHE_KEY,
      tasks,
      3600 * 6 // plus 6 hours
    );
  },

  clearCachedTasks() {
    cache.clear(TASKS_CACHE_KEY);
  },

  /*
   * Create a new time tracking entry
   */
  createTimeTrackingEntry(taskId, description, start, end, tags, billable) {
    console.log(tags, billable);
    return new Promise((resolve, reject) => {
      request(
        {
          method: "POST",
          url: `${teamRootUrl()}/time_entries`,
          headers: {
            Authorization: store.get("settings.clickup_access_token"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description,
            tid: taskId,
            start: start.valueOf(),
            duration: end.valueOf() - start.valueOf(),
            tags,
            billable,
          }),
        },
        (error, response) => {
          console.log(JSON.parse(response.body).data);
          if (error) return reject(error);
          resolve(JSON.parse(response.body).data);
        }
      );
    });
  },

  /*
   * Update an exisiting time tracking entry
   */
  updateTimeTrackingEntry(entryId, description, start, end) {
    return new Promise((resolve, reject) => {
      request(
        {
          method: "PUT",
          url: `${teamRootUrl()}/time_entries/${entryId}`,
          headers: {
            Authorization: store.get("settings.clickup_access_token"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description,
            start: start.valueOf(),
            duration: end.valueOf() - start.valueOf(),
          }),
        },
        (error, response) => {
          if (error) return reject(error);
          resolve(JSON.parse(response.body).data[0]);
        }
      );
    });
  },

  /*
   * Deleta a time tracking entry
   */
  deleteTimeTrackingEntry(entryId) {
    return new Promise((resolve, reject) => {
      request(
        {
          method: "DELETE",
          url: `${teamRootUrl()}/time_entries/${entryId}`,
          headers: {
            Authorization: store.get("settings.clickup_access_token"),
            "Content-Type": "application/json",
          },
        },
        (error, response) => {
          if (error) return reject(error);
          resolve(JSON.parse(response.body).data[0]);
        }
      );
    });
  },

  /*
   * Fetch all members from all teams you have access to
   */
  getUsers() {
    return new Promise((resolve, reject) => {
      request(
        {
          method: "GET",
          url: `${BASE_URL}/team/`,
          headers: {
            Authorization: store.get("settings.clickup_access_token"),
            "Content-Type": "application/json",
          },
        },
        (error, response) => {
          if (error) return reject(error);

          const teams = JSON.parse(response.body).teams;
          const users = teams
            .flatMap((team) => team.members)
            .map((member) => member.user)
            .filter((user) => user.role !== 4) // Remove guests
            .filter((user, index, self) => self.indexOf(user) === index) // only unique id's
            .sort(function (a, b) {
              // sort alphabetically by name
              if (a.username === b.username) return 0;

              return a.username < b.username ? -1 : 1;
            });

          resolve(users);
        }
      );
    });
  },

  /*
   * Fetch users from cache
   */
  async getCachedUsers() {
    const cached = cache.get(USERS_CACHE_KEY);

    if (cached) {
      return cached;
    }

    return cache.put(
      USERS_CACHE_KEY,
      await this.getUsers(),
      3600 * 6 // plus 6 hours
    );
  },
};
