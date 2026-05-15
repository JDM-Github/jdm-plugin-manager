# JDM Plugin Manager — TODO

---

## 🔴 High Priority

### Cancel / Kill Running Command
- [ ] Add a cancel/kill button in the terminal panel while a command is running
- [ ] Send a kill signal from the frontend via socket (`run_kill` event)
- [ ] Backend kills the subprocess by PID on `run_kill`
- [ ] Emit `run_done` with `{ code: null, success: false, killed: true }` after kill
- [ ] UI reflects killed state in the terminal (e.g. "Process terminated" line)
- [ ] Clean up the prompt queue for that sid on kill

---

### Multi-Tab Command Runner
- [ ] Runner supports multiple tabs, each is an independent running session
- [ ] Each tab has its own socket session / queue
- [ ] Tabs show plugin name + command as the label
- [ ] Tab has a status indicator (idle / running / done / error / killed)
- [ ] Closing a tab kills the process if still running
- [ ] Tabs persist within the session (not across app restart, that's fine)
- [ ] Max tab limit (maybe 5-8, decide later)

---

### Finish Notifications
- [ ] When a command finishes and the user is NOT on that plugin's runner page, show a notification
- [ ] Notification pops up at the top of the UI (toast-style)
- [ ] Notification shows plugin name, command, and success/fail status
- [ ] Notifications can stack up (multiple runs finishing)
- [ ] When stacked and not hovered — shows as a stack of cards (layered/offset design)
- [ ] When hovered — fans out and shows all notifications individually
- [ ] When user navigates to that plugin runner — notifications for that plugin auto-dismiss
- [ ] Notifications have a manual dismiss (x) per item
- [ ] Notifications survive page navigation within the app

---

## 🟡 Medium Priority

### Remote Command Execution (JDM Network / SSH-like)
> Think Steam Family Sharing but for plugins

- [ ] A user can host their machine as a node (opt-in, explicit)
- [ ] Other users can request to connect to a host node
- [ ] Host accepts/denies connection requests
- [ ] Host can allowlist specific plugins that are allowed to run remotely
- [ ] Host can allowlist specific users who are allowed to connect
- [ ] Remote runner streams output back to the requester via socket (same as local)
- [ ] Session is authenticated — no anonymous connections
- [ ] Host can revoke access at any time and kill active remote sessions
- [ ] Works even if the plugin is not yet approved in the catalog (since it runs on the host's machine)
- [ ] UI shows clearly when you are running a command remotely vs locally
- [ ] Security — remote execution is sandboxed to allowed plugins only, no arbitrary commands

**Notes:**
- This is essentially socket-tunneled subprocess execution
- The host machine runs the actual Node process, streams stdout back through the server
- Think about rate limiting and abuse prevention before shipping this

---

## 🟢 Later / Nice to Have

### Plugin Template (`jdm-plugin-template`)
- [ ] `npm create jdm-plugin` scaffolds a working plugin
- [ ] Template includes `package.json` with `jdmPlugin` key pre-configured
- [ ] Template includes a sample `run()` export with one example command
- [ ] Template includes example `--flag` argument so the pattern is clear
- [ ] Template includes a README explaining how to develop and publish
- [ ] Optionally: a `dev` command that links directly into JDM Plugin Manager for local testing

---

### Website & Docs
- [ ] Landing page explaining what JDM Plugin Manager is
- [ ] How to install (download, requirements)
- [ ] How to use (browse, install, run)
- [ ] How to build a plugin (link to template, explain `jdmPlugin` schema, explain `run()`)
- [ ] Plugin catalog page (pulls from Supabase, publicly browsable without the app)
- [ ] Changelog / release notes page

---

### Feedback System
- [ ] Users can leave feedback/rating on a plugin from within the app
- [ ] Feedback tied to npm username (already authed)
- [ ] Feedback visible on the plugin detail page
- [ ] Catalog page on the website also shows ratings

---

### Misc
- [ ] Run history — log of past runs (plugin, command, args, exit code, timestamp)
- [ ] Click a past run to re-run it with the same args
- [ ] Search/filter run history