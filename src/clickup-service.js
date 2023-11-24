import request from 'request';
import store from '@/store';
import cache from '@/cache';
import {ClickUpItemFactory} from "@/model/ClickUpModels";

const BASE_URL = 'https://api.clickup.com/api/v2';

// Cache keys
const HIERARCHY_CACHE_KEY = 'hierarchy';
const USERS_CACHE_KEY = 'users';

// Factory
const factory = new ClickUpItemFactory();

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

    async getHierarchy() {
        console.log("Getting hierarchy")
        let options = await this.getSpaces()
        await Promise.all(options.map(async (option) => {
            const lists = await this.getLists(option.id);
            await Promise.all(lists.map(async (list) => {
                await this.getTasks(list.id).then(tasks => {
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

    // Keep in mind that this also could be cashed
    getColorsBySpace() {
        let spaces = this.getSpaces()
        let colors = Map()

        spaces.forEach(space => {
            colors.set(space.id, space.color)
        })

        return colors
    },

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

    async getTasks(listId) {

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
