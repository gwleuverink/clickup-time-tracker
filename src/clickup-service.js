import request from 'request';
import store from '@/store';
import cache from '@/cache';
import {ClickUpItem, ClickUpType} from "@/model/ClickUpModels";
//import {list} from "postcss";

const BASE_URL = 'https://api.clickup.com/api/v2';

// Cache keys
const TASKS_CACHE_KEY = 'tasks';
const SPACES_CACHE_KEY = 'spaces';
const LISTS_CACHE_KEY = 'lists';
const USERS_CACHE_KEY = 'users';

function teamRootUrl() {
    return `${BASE_URL}/team/${store.get('settings.clickup_team_id')}`
}

export default {

    /*
     * Retrieves a page of tasks from the ClickUp API
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
     * Get all time tracking entries within a given range
     */
    getTimeTrackingRange(start, end, userId) {

        return new Promise((resolve, reject) => {

            const params = {
                start_date: start.valueOf(),
                end_date: end.valueOf(),
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

    async getHierarchy() {
        console.log("Getting hierarchy")
        let options = []

        // TODO: rewrite to cashed spaces
        let spaces = await this.getCachedSpaces()

        spaces.forEach(space => {
            let item = new ClickUpItem(space.id, space.name, ClickUpType.SPACE)
            options.push(item)
        })



        await Promise.all( options.map(async (option) => {
            const lists = await this.getCachedLists(option.id);
            await Promise.all(lists.map(async (list) => {
                let list_item = new ClickUpItem(list.id, list.name, ClickUpType.LIST)
                const tasks = await this.getCachedTasks(list_item.id);

                for (const task of tasks) {
                    const task_item = new ClickUpItem(task.id, task.name, ClickUpType.TASK)
                    list_item.addChild(task_item)
                }

                // Add list to space
                option.addChild(list_item);
            }))

        }));

        console.log("Hierarchy built")
        return options
    },

    flushCached() {
        cache.flush()
    },

    async getSpaces() {

        return new Promise((resolve, reject) => {
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

    },

    /*
        * Fetch spaces from cache
     */
    async getCachedSpaces() {
        //1 list of spaces so only 1 cache key
        const cached = cache.get(SPACES_CACHE_KEY)

        if (cached) {
            console.log("Got " + cached.length + " spaces from cache")
            return cached
        }

        let spaces = await this.getSpaces()

        console.log("Got " + spaces.length + " spaces from api")
        return cache.put(
            SPACES_CACHE_KEY,
            spaces,
            3600 * 6 // plus 6 hours
        )
    },

    async getLists(spaceId) {
        const folderlessLists = await this.getFolderlessLists(spaceId);

        let folderedLists = [];
        const folders = await this.getFolders(spaceId);

        await Promise.all(folders.map(async (folder) => {
            folderedLists = folderedLists.concat(await this.getFolderedLists(folder.id));
        }))

        return folderlessLists.concat(folderedLists.flat());
    },

    async getCachedLists(spaceId) {
        //Lists are cached per space, so multiple cache keys, one for each space
        //Cache key = LIST_CACHE_KEY + spaceId

        let lists = [];
        const cached = cache.get(LISTS_CACHE_KEY + spaceId)

        if (cached) {
            console.log("Got " + cached.length + " lists from cache for space " + spaceId)
            return cached
        }

        // Fetch a fresh tasklist
        lists = await this.getLists(spaceId)

        console.log("Got " + lists.length + " lists from api for space " + spaceId)
        cache.put(
            LISTS_CACHE_KEY + spaceId,
            lists,
            3600 * 6 // plus 6 hours
        )

        return lists
    },

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

    async getTasks(listId) {

        let results = await new Promise((resolve, reject) => {

            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${BASE_URL}/list/${listId}/task?archived=false&include_closed=false&subtasks=false`,

                headers: {
                    'Authorization': store.get('settings.clickup_access_token'),
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if (error) return reject(error)

                resolve(JSON.parse(response.body).tasks || [])
            });
        })

        return results
    },

    async getCachedTasks(listId) {
        //Tasks are cached per list, so multiple cache keys, one for each list
        //Could be a lot of cache keys, but it's the only way to keep the cache up to date...
        //or is it? cash db running on the api server? something like redis?

        let tasks = [];
        const cached = cache.get(TASKS_CACHE_KEY + listId)

        if (cached) {
            console.log("Got " + cached.length + " tasks from cache for list " + listId)
            return cached
        }

        tasks = await this.getTasks(listId)
        console.log("Got " + tasks.length + " tasks from api for list " + listId)

        cache.put(
            TASKS_CACHE_KEY + listId,
            tasks,
            3600 * 6 // plus 6 hours
        )

        return tasks
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
