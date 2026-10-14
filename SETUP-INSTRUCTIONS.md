# TechCare setup — Windows

## Quick start (launcher)

Install **Node.js 24 or later** and start your MySQL or MariaDB server (for XAMPP, start MySQL in the XAMPP Control Panel). Then, in the project folder, double-click **`setup.bat`** (Windows) or run **`./setup.sh`** (macOS/Linux):

- **1 — Start TechCare** (the default; press Enter). Starts Ollama if it is installed, then the app at `http://127.0.0.1:3000`.
- **2 — Set up everything.** Installs dependencies, creates `.env.local`, creates or upgrades the database, installs Ollama if it is missing (winget on Windows, the official script on Linux, Homebrew on macOS), downloads the assistant's AI models (about 2 GB the first time), and offers to create an administrator.

You can pass the choice directly, for example `setup.bat 2` or `./setup.sh 1`. `npm run setup:database` runs only the database step. The manual steps below do the same work by hand.

## Manual setup

1. [Download TechCare](https://github.com/Vernsmoke/TechCare/archive/refs/heads/main.zip) and extract the ZIP, or clone the repository. If the repository is private, sign in with an account that has access.
2. Install **Node.js 24 or later** from [nodejs.org](https://nodejs.org/).
3. Install and start a local MySQL or MariaDB server. Create an empty `techcare` database and a dedicated application user with a password.
4. Open **PowerShell** inside the main extracted folder containing `frontend`, `backend`, and the root `package.json`. Run commands there.
5. Run these commands one at a time:

   ```powershell
   npm ci
   npm run setup
   ```

6. Set `TECHCARE_DB_HOST`, `TECHCARE_DB_PORT`, `TECHCARE_DB_NAME`, `TECHCARE_DB_USER`, and `TECHCARE_DB_SSL=0` in the root `.env.local` for local development. Leave `TECHCARE_DB_PASSWORD=` blank if your MySQL account has no password; otherwise set its password. Apply `backend/schema/mysql.sql` to the selected database. An existing database instead needs each newer `backend/schema/mysql-upgrade-*.sql` file applied once, in order (version 7 → `mysql-upgrade-8.sql` → `mysql-upgrade-9.sql`); `npm run check:setup` reports the version it expects. Keep any database password private.

   ```powershell
   npm run create-admin
   ```

7. Enter your preferred administrator name, email, and password when prompted. The password must be **12–128 characters**. Password typing is hidden.
8. Start the app:

   ```powershell
   npm run dev
   ```

9. Open [http://127.0.0.1:3000](http://127.0.0.1:3000) and sign in using the administrator email and password you just created.

## Access key and accounts

**No API or access key is required.** The built-in help assistant works with local project content.

The GitHub download does not include existing accounts or saved app data. Create your own administrator with `npm run create-admin`, as shown above.

## Opening TechCare again

Open PowerShell in the project folder and run `npm run dev`. You only need to install dependencies, copy the environment file, and create the administrator during the first setup.

Keep PowerShell open while using the app. Press **Ctrl+C** to stop it. Local accounts are saved in MySQL; protected uploads remain in the `data` folder on that computer.

## If “Accept and continue” does not work

Run `npm run check:setup` from the repository root. The root `.env.local` should contain:

```dotenv
TECHCARE_ORIGIN=http://127.0.0.1:3000
TECHCARE_SECURE_COOKIES=0
TECHCARE_DEV_VERIFY=1
TECHCARE_DB_DRIVER=mysql
TECHCARE_DB_HOST=127.0.0.1
TECHCARE_DB_PORT=3306
TECHCARE_DB_NAME=techcare
TECHCARE_DB_USER=your-app-user
TECHCARE_DB_PASSWORD=
TECHCARE_DB_SSL=0
```

Open exactly `http://127.0.0.1:3000`. Opening `http://localhost:3000` while the setting says `127.0.0.1` fails the same-origin security check. Do not add a trailing slash or a page path to the setting. Restart the server after changing `.env.local`.

The environment file belongs beside the root `package.json`, not inside `frontend`. It is excluded from GitHub because it contains database and potentially SMTP credentials. Each developer runs `npm run setup` once; this command never overwrites existing settings. Do not upload your `.env.local` to GitHub.

## Other computers

These commands run a separate local copy on each developer's computer. `127.0.0.1` always means the device opening the browser; it cannot point a classmate's phone or laptop at your computer. To share one running app, use a configured host and matching HTTPS origin following [operations](docs/OPERATIONS.md). `npm run dev` intentionally listens only on this computer.
