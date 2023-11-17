import request from 'request';
import store from '@/store';
import cache from '@/cache';
import {ClickUpItem, ClickUpType} from "@/model/ClickUpModels";
//import {list} from "postcss";

const BASE_URL = 'https://api.clickup.com/api/v2';

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

    /* NOTE TO SELF: You did not prepare for this project. You just started coding. You are a software architect. You
    should know better. I hope you learn from this. I will learn from this. I will analyse further additions more in depth.
    */

    /*
    Try out function to build hierarchy in the back end and send it to the front end. instead of sending all the data to
    the front end and let the front end build the hierarchy. If it doesnt take too long to build the hierarchy, this might
    be a better solution.
     */
    async getHierarchy() {
        console.log("Getting hierarchy")
        let options = []

        // TODO: rewrite to cashed spaces
        let spaces = await this.getSpaces()

        spaces.forEach(space => {
            let item = new ClickUpItem(space.id, space.name, ClickUpType.SPACE)
            options.push(item)
        })

        console.log("Got " + spaces.length + " spaces")

        await Promise.all( options.map(async (option) => {
            const lists = await this.getLists(option.id);
            await Promise.all(lists.map(async (list) => {
                let list_item = new ClickUpItem(list.id, list.name, ClickUpType.LIST)
                const tasks = await this.getAllTasks(list_item.id);

                for (const task of tasks) {
                    const task_item = new ClickUpItem(task.id, task.name, ClickUpType.TASK)
                    list_item.addChild(task_item)
                }
                if (list_item.children.length > 0) {
                    console.log("Got " + list_item.children.length + " tasks for list " + list_item.name + "(" + list_item.id + ")" + " in space " + option.name + "(" + option.id + ")");
                } else {
                    console.log("Got no tasks for list " + list_item.name + "(" + list_item.id + ")" + " in space " + option.name + "(" + option.id + ")");
                }

                // Add list to space
                option.addChild(list_item);
            }))

        }));

        console.log("Hierarchy built")
        return options
    },

    async getChildren(option) {
        return new Promise((resolve, reject) => {
            switch (option.type) {
                case ClickUpType.SPACE:
                    resolve(this.getLists(option.id))
                    break
                case ClickUpType.LIST:
                    resolve(this.getCachedTasks(option.id))
                    break
                case ClickUpType.TASK:
                    //selectedItem = option
                    break
                default:
                    console.error("Unknown type")
                    reject()
            }
        })
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

        let shared = await this.getHierarchy()
        console.dir(shared)

        // Comment is here just to test the above code
        /*
        const cached = cache.get(SPACES_CACHE_KEY)

        if (cached) {
            return cached
        }

        // Fetch a fresh spaces list

        let spaces = await this.getSpaces()

        return cache.put(
            SPACES_CACHE_KEY,
            spaces,
            3600 * 6 // plus 6 hours
        )
         */
    },

    clearCachedSpaces() {
        cache.clear(SPACES_CACHE_KEY)
    },

    async getLists(spaceId = null) {
        const folderlessLists = await this.getFolderlessLists(spaceId);

        let folderedLists = [];
        const folders = await this.getFolders(spaceId);

        await Promise.all(folders.map(async (folder) => {
            folderedLists = folderedLists.concat(await this.getFolderedLists(folder.id));
        }))

        return folderlessLists.concat(folderedLists.flat());
    },

    async getCachedLists(spaceId) {

        let lists = [];
        //const cached = cache.get(LISTS_CACHE_KEY)

        //TODO: if spaceID is used, the way lists are cached and returned must be more specific, or different otherwise
        //  it only returns the lists of the first space
        /*
        if (cached && cached.length > 0) {
            console.log('cached lists:');
            lists = cached
        } else {
            // Fetch a fresh tasklist
            console.log('fetching fresh lists');
            lists = await this.getLists(spaceId)
        }
        */

        cache.put(
            LISTS_CACHE_KEY,
            lists,
            3600 * 6 // plus 6 hours
        )

        if (spaceId) {
            lists = lists.filter(list => list.space.id === spaceId)
        }

        return lists

    },

    clearCachedLists() {
        cache.clear(LISTS_CACHE_KEY)
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

    async getAllTasks(listId = null) {

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

    async getTasksPage(page) {
        let url = `${teamRootUrl()}/task`

        page = page || 0

        let results = await new Promise((resolve, reject) => {

            request({
                method: 'GET',
                mode: 'no-cors',
                url: url + '?' + new URLSearchParams({
                    page: page,
                    archived: false,
                    include_closed: false,
                }),

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

    // eslint-disable-next-line no-unused-vars
    async getTasks(listId = null) {
        let page = 0
        let results = []

        do {
            try {
                results = results.concat(await this.getTasksPage(page, listId))
                page++
            } catch (e) {
                console.log(`Error retrieving tasks page ${page}. Retrying...`, e)
            }
        } while (results.length / page === 100)

        return results
    },

    //TODO: List specific cashing?
    async getCachedTasks(listId = null) {

        let tasks = [];
        const cached = cache.get(TASKS_CACHE_KEY)

        if (cached.length > 0) {
            console.log('cached tasks:');
            console.dir(cached)
            tasks = cached
        } else {
            // Fetch a fresh tasks list
            // Fetch a fresh tasklist
            console.log('fetching fresh tasks');
            tasks = await this.getTasks(listId)
            console.log('fetched fresh tasks');
            console.dir(tasks);
        }

        // Cache all tasks
        cache.put(
            TASKS_CACHE_KEY,
            tasks,
            3600 * 6 // plus 6 hours
        )

        // Filter tasks by listId
        if (listId) {
            tasks = tasks.filter(task => task.list.id === listId)
        }

        return tasks
    },

    clearCachedTasks() {
        cache.clear(TASKS_CACHE_KEY)
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
