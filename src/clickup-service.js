import request from 'request';
import store from '@/store';
import cache from '@/cache';
import {ClickUpItemFactory} from "@/model/ClickUpModels";

const BASE_URL = 'https://api.clickup.com/api/v2';

// Cache keys
const HIERARCHY_CACHE_KEY = 'hierarchy';
const USERS_CACHE_KEY = 'users';

// Factory
// The factory is used to create the correct model objects from the API response.
// But, sometimes you don't want to create a model object, but just the api dump. So maybe an idea for future
// refactoring, would to turn the factory optioinal based on a parameter. But for now, this works.
const factory = new ClickUpItemFactory();

function teamRootUrl() {
    return `${BASE_URL}/team/${store.get('settings.clickup_team_id')}`
}

export default {

    /*
     * Checks if the given token is valid by making a request to the user endpoint.
     */
    tokenValid(token) {
        return new Promise((resolve, reject) => {
            request({
                method: 'GET',
                mode: 'no-cors',
                url: BASE_URL + '/user',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)

                const user = JSON.parse(response.body).user

                if (!user) reject('Invalid response')

                resolve(true)
            });
        })
    },

    /*
     * Builds a hierarchy of spaces, folders, lists, tasks and subtasks, from a team.
     * Can be used to display the treeview options.
     */
    async getHierarchy() {
        console.log("Getting hierarchy")
        let options = await this.getSpaces()
        await Promise.all(options.map(async (option) => {
            const lists = await this.getLists(option.id);
            await Promise.all(lists.map(async (list) => {
                await this.getTasksFromList(list.id).then(tasks => {
                    list.addChildren(tasks)
                });
                option.addChild(list);
            }))
        }));
        console.log("Hierarchy built")
        return options
    },

    async getCachedHierarchy() {
        const cached = cache.get(HIERARCHY_CACHE_KEY)

        if (cached) {
            console.log("Got hierarchy from cache")
            return cached
        }

        let hierarchy = await this.getHierarchy()
        return cache.put(
            HIERARCHY_CACHE_KEY,
            hierarchy,
            3600 * 6 // plus 6 hours
        )
    },

    clearCachedHierarchy() {
        cache.clear(HIERARCHY_CACHE_KEY)
    },

    /*
    * Get all spaces from a team
     */
    async getSpaces() {

        let response = await new Promise((resolve, reject) => {
            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${BASE_URL}/team/${store.get('settings.clickup_team_id')}/space?archived=false'`,

                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).spaces || [])
            });
        })

        return response.map(space => factory.createSpace(space))
    },

    /*
    * Get all lists from a space. This had to be done in two steps because the API does not support getting all lists
    * from a space. So we first get all folders, then get all lists from each folder, and finally get all lists that are
    * not in a folder. Then we combine all lists and return them. A single api call would be much nicer. sigh.
    */
    async getLists(spaceId) {
        const folderlessLists = await this.getFolderlessLists(spaceId);

        let folderedLists = [];
        const folders = await this.getFolders(spaceId);

        await Promise.all(folders.map(async (folder) => {
            folderedLists = folderedLists.concat(await this.getFolderedLists(folder.id));
        }))

        let list = folderlessLists.concat(folderedLists.flat());
        return list.map(list => factory.createList(list))
    },

    /*
    * Get all folders from a space
     */
    async getFolders(spaceId) {
        return new Promise((resolve, reject) => {

            request({
                method: 'GET',
                url: `${BASE_URL}/space/${spaceId}/folder?archived=false`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).folders || [])
            });
        })
    },

    /*
    * Get all lists from a folder
     */
    async getFolderedLists(FolderId) {
        return new Promise((resolve, reject) => {

            request({
                method: 'GET',
                url: `${BASE_URL}/folder/${FolderId}/list?archived=false`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).lists || [])
            });
        })
    },

    /*
    * Get all lists from a space that are not in a folder
     */
    async getFolderlessLists(spaceId) {
        return new Promise((resolve, reject) => {

            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${BASE_URL}/space/${spaceId}/list?archived=false`,

                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).lists || [])
            });
        })
    },

    /*
    * Get all tasks from a list
     */
    async getTasksFromList(listId) {

        let results = await new Promise((resolve, reject) => {

            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${BASE_URL}/list/${listId}/task?archived=false&include_markdown_description=false&subtasks=true&include_closed=false`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).tasks || [])
            });
        })

        // Link subtasks to their parent
        // It would be nice if the API would do this for us, but it doesn't. Nested list? Something? Anything?
        // Maybe it could be done faster. I would like to see it, if someone can do it better. out of curiosity.
        let subtasks = results
            .filter(task => task.parent != null)

        let tasks = results
            .filter(task => task.parent == null)
            .map(task => {
                let item = factory.createTask(task)
                subtasks
                    .filter(subtask => subtask.parent == task.id)
                    .map(subtask => factory.createSubtask(subtask))
                    .forEach(subtask => item.addChild(subtask))
                return item
            })
        return tasks
    },

    async getTask(taskId) {
        return new Promise((resolve, reject) => {
            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${BASE_URL}/task/${taskId}?include_subtasks=false&include_markdown_description=false`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body) || [])
            });
        })
    },

    async getColorsBySpace() {
        let spaces = await this.getSpaces()
        let colors = new Map()

        spaces.forEach(space => {
            colors.set(space.id, space.color)
        })

        return colors
    },

    async getSpaceIdFromTask(taskId) {
        let task = await this.getTask(taskId)
        return task.space.id
    },

    /*
    * Get all time tracking entries within a given range
    */
    getTimeTrackingRange(start, end, userId) {

        return new Promise((resolve, reject) => {

            const params = {
                start_date: start.valueOf(),
                end_date: end.valueOf(),
                include_location_names: true,
            }

            // Only set assignee when argument was given
            if (userId) {
                params.assignee = userId
            }

            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${teamRootUrl()}/time_entries?` + new URLSearchParams(params),

                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                const body = JSON.parse(response.body)

                if (body.err) { // This friggin api... return a decent response code for fuck sake
                    reject(body.err)
                }
                resolve(body.data || [])
            });
        })
    },

    /*
     * Create a new time tracking entry
     */
    createTimeTrackingEntry(taskId, description, start, end) {
        return new Promise((resolve, reject) => {

            request({
                method: 'POST',
                url: `${teamRootUrl()}/time_entries`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description,
                    "tid": taskId,
                    "start": start.valueOf(),
                    "duration": end.valueOf() - start.valueOf(),
                })
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).data)
            })
        })
    },

    /*
     * Update an exisiting time tracking entry
     */
    updateTimeTrackingEntry(entryId, description, start, end) {
        return new Promise((resolve, reject) => {

            request({
                method: 'PUT',
                url: `${teamRootUrl()}/time_entries/${entryId}`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description,
                    "start": start.valueOf(),
                    "duration": end.valueOf() - start.valueOf(),
                })
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).data[0])
            })
        })
    },

    /*
     * Deleta a time tracking entry
     */
    deleteTimeTrackingEntry(entryId) {
        return new Promise((resolve, reject) => {

            request({
                method: 'DELETE',
                url: `${teamRootUrl()}/time_entries/${entryId}`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)
                resolve(JSON.parse(response.body).data[0])
            })
        })
    },

    /*
     * Fetch all members from all teams you have access to
     */
    getUsers() {
        return new Promise((resolve, reject) => {

            request({
                method: 'GET',
                url: `${BASE_URL}/team/`,
                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)

                const teams = JSON.parse(response.body).teams
                const users = teams
                    .flatMap(team => team.members)
                    .map(member => member.user)
                    .filter(user => user.role !== 4) // Remove guests
                    .filter((user, index, self) => self.indexOf(user) === index) // only unique id's
                    .sort(function (a, b) { // sort alphabetically by name
                        if (a.username === b.username) return 0

                        return a.username < b.username
                            ? -1
                            : 1
                    })

                resolve(users)
            })
        })
    },

    /*
     * Fetch users from cache
     */
    async getCachedUsers() {
        const cached = cache.get(USERS_CACHE_KEY)

        if (cached) {
            return cached
        }

        return cache.put(
            USERS_CACHE_KEY,
            await this.getUsers(),
            3600 * 6 // plus 6 hours
        )
    }
}
