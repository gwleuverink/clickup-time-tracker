# ClickUp Time tracker

This is a work in progress..

Abracadabra.. please make my life easier! Shazam! Also, ClickUp Time tracking can eat a d**k
## Project setup
```
npm install
cp .env.example .env
```

Make sure you fill out the `.env` file. I might create a proper settings page later, but for the time being all secrets are stored in here.

### Compiles and hot-reloads for development
```
npm run electron:serve
```

### Build for production
```
npm run electron:build
```

### Lints and fixes files
```
npm run lint
```

## Roadmap
- [x] Fetch & list tracking entries for active view
- [x] Create a new entry by dragging on the calendar
- [x] Search through all Clickup tasks in searchable select field when adding a new entry
- [x] Refresh cached Clickup tasks asynchronously in the background process with convenient UI control
- [x] Update a time entry when resizing/moving the event
- [x] Disable editing (resize/drag/delete) when the associated task is closed

- [ ] Make tracked entries deletable
- [ ] Sort selectable tasks by latest log entry (with your user id)
- [ ] After that sort selectable tasks by updated_at date
- [ ] Reset a task when an API error occured while editing (resize/drag etc)
- [ ] Show proper toast alerts when things happen in the app
- [ ] Button to refresh current view (and tracked entries in that view)
- [ ] Double click event to show details
- [ ] In details modal make an option to opdate tracking description/attached task
- [ ] In details modal add a button to delete the tracking entry
- [ ] Add select + backspace to delete support
- [ ] Filter Tasks API call to exclude Tasks with status 'Requested, Backlog, Closed' etc
- [ ] Add copy/paste support
