import request from 'request';

const TEAM_ID = process.env.VUE_APP_CLICKUP_TEAM_ID;
const API_TOKEN = process.env.VUE_APP_CLICKUP_ACCESS_TOKEN;
const BASE_URL = `https://api.clickup.com/api/v2/team/${TEAM_ID}`

export default  {
    async getTimeTrackingRange(start, end) {

        return await new Promise((resolve, reject) => {
            request({
                method: 'GET',
                mode: 'no-cors',
                url: `${BASE_URL}/time_entries?` + new URLSearchParams({
                    start_date: start.valueOf(),
                    end_date: end.valueOf(),
                }),

                headers: {
                    'Authorization': API_TOKEN,
                    'Content-Type': 'application/json'
                }
            }, (error, response) => {
                if(error) return reject(error)
                resolve(JSON.parse(response.body).data || [])
            });
        })
    }
}
