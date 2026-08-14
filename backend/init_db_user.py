import sys
import os
import getpass
import pymysql

def main():
    print("==========================================")
    print("NeuBitAt Event Booking System - DB Setup")
    print("==========================================")
    
    # 1. Get root password securely
    if len(sys.argv) > 1:
        root_pwd = sys.argv[1]
    else:
        root_pwd = getpass.getpass("Enter MySQL root password: ")

    # 2. Get neubit_app password
    if len(sys.argv) > 2:
        app_pwd = sys.argv[2]
    else:
        app_pwd = getpass.getpass("Enter desired password for 'neubit_app' user: ")

    if not app_pwd:
        app_pwd = "NeubitAppLocalPassword123!"

    print("\nConnecting to local MySQL server as root...")
    try:
        conn = pymysql.connect(
            host="localhost",
            port=3306,
            user="root",
            password=root_pwd,
            autocommit=True
        )
    except Exception as e:
        print(f"\n[ERROR] Could not connect to MySQL as root: {e}")
        sys.exit(1)

    print("[SUCCESS] Connected to MySQL as root.")

    db_name = "neubit_event_booking"
    app_user = "neubit_app"

    with conn.cursor() as cur:
        # Create database
        cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        print(f"[SUCCESS] Database '{db_name}' verified/created.")

        # Create user and grant privileges
        cur.execute(f"CREATE USER IF NOT EXISTS '{app_user}'@'localhost' IDENTIFIED BY %s;", (app_pwd,))
        cur.execute(f"ALTER USER '{app_user}'@'localhost' IDENTIFIED BY %s;", (app_pwd,))
        cur.execute(f"GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{app_user}'@'localhost';")
        cur.execute("FLUSH PRIVILEGES;")
        print(f"[SUCCESS] User '{app_user}'@'localhost' granted full privileges on '{db_name}'.")

    conn.close()

    # 3. Create or update root .env file
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    env_path = os.path.join(project_root, ".env")

    env_content = f"""# Backend Server Configuration
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER={app_user}
DB_PASSWORD={app_pwd}
DB_NAME={db_name}

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
"""

    with open(env_path, "w", encoding="utf-8") as f:
        f.write(env_content)

    print(f"[SUCCESS] Local .env file written to {env_path}")

    # 4. Verify connection with neubit_app
    print(f"\nVerifying connection using app user '{app_user}'...")
    try:
        app_conn = pymysql.connect(
            host="localhost",
            port=3306,
            user=app_user,
            password=app_pwd,
            database=db_name
        )
        with app_conn.cursor() as cur:
            cur.execute("SELECT 1;")
            res = cur.fetchone()
            if res and res[0] == 1:
                print("[SUCCESS] Verified database connection with 'neubit_app'!")
        app_conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to connect with '{app_user}': {e}")
        sys.exit(1)

    print("\n==========================================")
    print("Database initialization completed cleanly!")
    print("==========================================")

if __name__ == "__main__":
    main()
