import argparse
import json
import sys
import textwrap
import time
from typing import Any
from app.config import AppConfig
from supabase import create_client, Client


# ─────────────────────────────────────────────────────────────
#  Seed data  —  edit freely
# ─────────────────────────────────────────────────────────────
PLUGINS: list[dict[str, Any]] = [
    {
        "namespace":    "electron-flask",
        "package":      "jdm-electron-flask",
        "description":  "Electron + Flask + React project manager",
        "commands":     ["create", "clean", "compile", "dev", "prod", "toexe", "install", "sync", "patch"],
        "is_official":  True,
        "approved":     True,
        "submitted_by": "jdmaster"
    },
    # {
    #     "namespace":    "tools",
    #     "package":      "jdm-tools",
    #     "description":  "Tools for JDM-CLI",
    #     "commands":     ["publish"],
    #     "is_official":  True,
    #     "approved":     True,
    #     "submitted_by": "jdmaster"
    # },
]

# Derived from PLUGINS — adjust linkPath per entry as needed
PLUGIN_PARTIALS: list[dict[str, Any]] = [
    {
        "namespace":    p["namespace"],
        "package":      p["package"],
        "version":      "1.0.0",
        "linkPath":     f"C:/JDM/CLI/{p['package']}",
        "submitted_by": p["submitted_by"],
    }
    for p in PLUGINS
]


# ─────────────────────────────────────────────────────────────
#  SQL — exec_sql helper function (run this ONCE in SQL Editor
#        if it doesn't exist yet)
# ─────────────────────────────────────────────────────────────
EXEC_SQL_FUNCTION = textwrap.dedent("""
    create or replace function exec_sql(query text)
    returns void
    language plpgsql
    security definer
    as $$
    begin
        execute query;
    end;
    $$;
""").strip()


# ─────────────────────────────────────────────────────────────
#  SQL — table definitions + RLS
# ─────────────────────────────────────────────────────────────
DROP_SQL = textwrap.dedent("""
    drop table if exists plugin_partials cascade;
    drop table if exists plugins cascade;
""").strip()

CREATE_SQL = textwrap.dedent("""
    create table plugins (
        id           uuid primary key default gen_random_uuid(),
        namespace    text not null,
        package      text not null,
        version      text not null default '1.0.0',
        description  text not null default '',
        commands     jsonb not null default '[]',
        is_official  boolean not null default false,
        approved     boolean,
        submitted_by text not null default '',
        created_at   timestamptz not null default now()
    );

    create table plugin_partials (
        id           uuid primary key default gen_random_uuid(),
        namespace    text unique not null,
        package      text unique not null,
        version      text not null default '1.0.0',
        "linkPath"   text not null default '',
        submitted_by text not null default '',
        created_at   timestamptz not null default now()
    );

    create or replace view plugins_latest as
    select distinct on (namespace) *
    from plugins
    where approved = true
    order by namespace, created_at desc;
""").strip()


# ─────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────

def _print_section(title: str) -> None:
    print(f"\n  {'─' * 44}")
    print(f"  {title}")
    print(f"  {'─' * 44}")


def _ok(msg: str)   -> None: print(f"    ✔  {msg}")
def _fail(msg: str) -> None: print(f"    ✖  {msg}")
def _info(msg: str) -> None: print(f"    ·  {msg}")


def _get_client() -> Client:
    url = AppConfig.SUPABASE_URL
    key = AppConfig.SUPABASE_KEY

    missing = []
    if not url: missing.append("SUPABASE_URL")
    if not key: missing.append("SUPABASE_KEY")

    if missing:
        _fail(f"Missing environment variable(s): {', '.join(missing)}")
        print()
        print("    Set them in a .env file or export them before running:")
        for m in missing:
            print(f"      export {m}=your_value_here")
        print()
        sys.exit(1)

    _info(f"Supabase URL: {url}")
    _info(f"Supabase KEY length: {len(key)}")
    return create_client(url, key)


def _rpc_exec(client: Client, sql: str, label: str) -> bool:
    """Run SQL via exec_sql RPC. Returns True on success."""
    try:
        client.rpc("exec_sql", {"query": sql}).execute()
        return True
    except Exception as exc:
        _fail(f"{label} failed: {exc}")
        _print_exec_sql_hint()
        return False


def _print_exec_sql_hint() -> None:
    print()
    print("    ── Prerequisite ───────────────────────────────────")
    print("    The 'exec_sql' function may not exist yet.")
    print("    Run this ONCE in your Supabase SQL Editor, then retry:")
    print()
    for line in EXEC_SQL_FUNCTION.splitlines():
        print(f"      {line}")
    print()


def drop_tables(client: Client) -> None:
    _print_section("DROP")
    _info("Dropping tables 'plugins' and 'plugin_partials' (cascade)...")

    if _rpc_exec(client, DROP_SQL, "DROP"):
        _ok("Tables dropped (or did not exist)")
    else:
        print("    ── Manual fallback ────────────────────────────────")
        print("    Run this in the Supabase SQL Editor:")
        print()
        for line in DROP_SQL.splitlines():
            print(f"      {line}")
        print()
        sys.exit(1)


def create_tables(client: Client) -> None:
    _print_section("CREATE")
    _info("Creating tables...")

    if _rpc_exec(client, CREATE_SQL, "CREATE"):
        _ok("Table 'plugins' created")
        _ok("Table 'plugin_partials' created (with version + linkPath)")
    else:
        print("    ── Manual fallback ────────────────────────────────")
        print("    Run this in the Supabase SQL Editor:")
        print()
        for line in CREATE_SQL.splitlines():
            print(f"      {line}")
        print()
        sys.exit(1)


def reload_schema(client: Client) -> None:
    _print_section("RELOAD SCHEMA CACHE")
    _info("Notifying PostgREST to reload schema cache...")

    try:
        client.rpc("exec_sql", {"query": "notify pgrst, 'reload schema';"}).execute()
        _ok("Schema cache reload triggered")
    except Exception as exc:
        _fail(f"Schema reload failed (non-fatal): {exc}")
        _info("Continuing anyway...")

    _info("Waiting 2s for PostgREST to reload...")
    time.sleep(2)
    _ok("Ready to seed")


def seed(client: Client) -> None:
    _print_section("SEED — plugins")
    _info(f"Inserting {len(PLUGINS)} plugin(s)...")

    successes = 0
    for plugin in PLUGINS:
        payload = {
            **plugin,
            "commands": plugin["commands"],
        }
        try:
            client.table("plugins").insert(payload).execute()
            _ok(f"Inserted  {plugin['namespace']}  ({plugin['package']})")
            successes += 1
        except Exception as exc:
            _fail(f"Failed to insert '{plugin['namespace']}': {exc}")

    print()
    if successes == len(PLUGINS):
        _ok(f"All {successes}/{len(PLUGINS)} plugins seeded successfully")
    else:
        _fail(f"Only {successes}/{len(PLUGINS)} plugins inserted — check errors above")
        sys.exit(1)


def seed_partials(client: Client) -> None:
    _print_section("SEED — plugin_partials")
    _info(f"Inserting {len(PLUGIN_PARTIALS)} plugin partial(s)...")

    successes = 0
    for partial in PLUGIN_PARTIALS:
        try:
            client.table("plugin_partials").insert(partial).execute()
            _ok(f"Inserted  {partial['namespace']}  ({partial['package']})  →  {partial['linkPath']}")
            successes += 1
        except Exception as exc:
            _fail(f"Failed to insert partial '{partial['namespace']}': {exc}")

    print()
    if successes == len(PLUGIN_PARTIALS):
        _ok(f"All {successes}/{len(PLUGIN_PARTIALS)} plugin partials seeded successfully")
    else:
        _fail(f"Only {successes}/{len(PLUGIN_PARTIALS)} plugin partials inserted — check errors above")
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="JDM GUI — plugin table seeder",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""
            examples:
              python seeder.py               drop → create → reload → seed
              python seeder.py --fresh        same, explicit flag
              python seeder.py --only-seed    insert only (table must exist)

            prerequisite (run once in Supabase SQL Editor):
              create or replace function exec_sql(query text)
              returns void language plpgsql security definer
              as $$ begin execute query; end; $$;
        """),
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Drop and recreate the tables before seeding (default behaviour)",
    )
    parser.add_argument(
        "--only-seed",
        action="store_true",
        help="Skip drop/create — just insert seed rows into existing tables",
    )
    args = parser.parse_args()

    print()
    print("  ╔══════════════════════════════════════════════╗")
    print("  ║       JDM GUI  —  Plugin Table Seeder        ║")
    print("  ╚══════════════════════════════════════════════╝")

    client = _get_client()
    _ok("Supabase client initialised")

    if not args.only_seed:
        drop_tables(client)
        create_tables(client)
        reload_schema(client)

    seed(client)
    seed_partials(client)

    _print_section("DONE")
    print()


if __name__ == "__main__":
    main()