# ─── auth.py ─────────────────────────────────────────────────
import subprocess
from jdm_electron_flask import JDMBlueprint, success, error


class AuthBlueprint(JDMBlueprint):
    def __init__(self):
        super().__init__("auth", __name__)


    @JDMBlueprint.get("/npm-whoami", auth=False)
    def npm_whoami():
        """
        Runs `npm whoami` as a subprocess and returns the logged-in npm username.
        The frontend uses this to skip a traditional login — if npm is authed,
        we treat the user as authenticated.
        """
        try:
            result = subprocess.run(
                "npm whoami",
                capture_output=True,
                text=True,
                timeout=8,
                shell=True,
            )
            if result.returncode == 0:
                username = result.stdout.strip()
                if not username:
                    return error("npm returned an empty username.", status=200)

                return success({
                    "authenticated": True,
                    "username": username,
                    "profileUrl": f"https://www.npmjs.com/~{username}",
                }, "npm authenticated")

            stderr = result.stderr.strip()
            return success({
                "authenticated": False,
                "username": None,
            }, stderr or "Not logged in to npm. Run `npm login` first.")

        except FileNotFoundError:
            return error("npm is not installed or not found on PATH.", status=200)

        except subprocess.TimeoutExpired:
            return error("npm whoami timed out. Check your network connection.", status=200)

        except Exception as e:
            return error(f"Unexpected error: {str(e)}", status=500)