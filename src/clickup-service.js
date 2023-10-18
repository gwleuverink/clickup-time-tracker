import request from 'request';
import store from '@/store';
import cache from '@/cache';
import {ClickUpType, ClickUpItem} from "@/model/ClickUpModels";
//import {list} from "postcss";

const BASE_URL = 'https://api.clickup.com/api/v2';
// TODO: Task cashing is removed after the optional list and space id.
// const TASKS_CACHE_KEY = 'tasks';
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

                if (! user) reject('Invalid response')

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
            if(userId) {
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

                if(body.err) { // This friggin api... return a decent response code for fuck sake
                    reject(body.err)
                }
                resolve(body.data || [])
            });
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

        this.getSpaces().then( spaces => {
            spaces.forEach(space => {
                space = new  ClickUpItem(space.id, space.name, ClickUpType.SPACE, [])
                this.getChildren(space).then(lists => {
                    // When lists are loaded, load tasks
                    lists.forEach(list => {
                        list = new ClickUpItem(list.id, list.name, ClickUpType.LIST, [])
                        // TODO: add subtask functionality
                        this.getChildren(list).then(tasks => {
                            list.children = tasks
                            console.log("Loaded tasks for " + list.type + " " + list.id)
                            console.dir(list.children)
                        })
                    }).then(() => {
                        space.children = lists
                        console.log("Loaded lists for " + space.type + " " + space.id)
                        console.dir(space.children)
                        options.push(space)
                    }).catch(error => {
                            console.error(error)
                        })
                }).catch(error => {
                    console.error(error)
                })
            })
        }).catch(error => {
            console.error(error)
        }).finally(() => {
            console.log("Hierarchy loaded")
            console.dir(options)
            return options
        })
    },

    async getChildren(option) {
        return new Promise((resolve, reject) => {
            switch (option.type) {
                case ClickUpType.SPACE:
                    resolve(this.getLists(option.id))
                    break
                case ClickUpType.LIST:
                    resolve(this.getTasks(option.id))
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

    async getLists(spaceId = null) {
        console.log('get lists for space: ' + spaceId);
        const folderlessLists = await this.getFolderlessLists(spaceId);

        let folderedLists = [];
        const folders = await this.getFolders(spaceId);

        await Promise.all(folders.map(async  (folder) => {
            folderedLists = folderedLists.concat(await this.getFolderedLists(folder.id));
        }))

        /*
        const folderedLists = await this.getFolders(spaceId).then(folders => {
            console.dir(folders);
            return Promise.all(folders.map(folder => this.getFolderedLists(folder.id)))
        });
         */

        let mergedLists = folderlessLists.concat(folderedLists.flat());
        return mergedLists;
    },

    async getCachedLists(spaceId) {

            const cached = cache.get(LISTS_CACHE_KEY)

            if (cached && cached.length > 0) {

                // check if chached lists are from the same space as requested

                if (cached[0].space.id == spaceId) {
                    return cached
                }
            }

            let lists = await this.getLists(spaceId)

            return cache.put(
                LISTS_CACHE_KEY,
                lists,
                3600 * 6 // plus 6 hours
            )

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

    /*
   * Retrieves a page of tasks from the ClickUp API
   * TODO: rewrite api call to use spaceId and listId. List id should be possible put it is a different api call. For spaceId i have no idea.
   */
    async getTasksPage(page, listId = null) {
        let url = `${teamRootUrl()}/task`

        console.log('get tasks page for list: ' + listId + ' and page: ' + page);

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

        if (listId) {
            results = results.filter(task => {
                return task.list.id === listId
            });
        }

        console.log(results.length + ' tasks found in list: ' + listId)

        return results
    },

    /*
    TODO: Do something with the spaceId. If you only use the clickup api we dont need it. But it could be of use in a
     cash solution.
    */
    // eslint-disable-next-line no-unused-vars
    async getTasks(spaceId = null, listId = null) {

        let page = 0
        let results = []

        do {
            try {
                results = results.concat(await this.getTasksPage(page, listId))
                page++
            } catch(e) {
                console.log(`Error retrieving tasks page ${page}. Retrying...`, e)
            }
        } while (results.length / page === 100)

        return results
    },

    /*
    TODO: Get cashing to work for tasks.
    create cash by spaceId and listId?
    get all and cash those? Then return the ones that are needed based on the listId? <-- this one (maybe)
     */

    /*
    async getCachedTasks(spaceId = null, listId = null) {

        const cached = cache.get(TASKS_CACHE_KEY)

        if (cached.length > 0) {
            console.log('cached tasks:');
            console.dir(cached)

            if (cached[0].list.id === listId) {
                return cached
            }
        }

        // Fetch a fresh tasklist
        console.log('fetching fresh tasks');
        let tasks = await this.getTasks(spaceId, listId)
        console.log('fetched fresh tasks');
        console.dir(tasks);

        // Only keep the data we care about
        tasks = tasks.map(task => ({
            id: task.id,
            name: `${task.name}`,
            folder: `${task.folder.name}`
        }))

        return cache.put(
            TASKS_CACHE_KEY,
            tasks,
            3600 * 6 // plus 6 hours
        )
    },

    clearCachedTasks() {
        cache.clear(TASKS_CACHE_KEY)
    },
     */

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
