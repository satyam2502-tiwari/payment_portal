import os
from flask import Flask, render_template, request, send_file, url_for, abort, jsonify
import pymysql
from werkzeug.utils import secure_filename
import bcrypt
import io
from flask_cors import CORS

# create the app
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
app.secret_key = os.environ.get("SESSION_SECRET", "dev_secret_key")

def connect_to_database():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="A9v@Lp!3bZ",
        database="payment_portal"
    )

def close_connection(connection):
    if connection.open:
        connection.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/signup')
def signup_page():
    return render_template('signup.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/transactions')
def transactions():
    return render_template('transactions.html')

@app.route('/transfers')
def transfers():
    return render_template('transfers.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/users')
def show_users():
    try:
        connection = connect_to_database()
        cursor = connection.cursor()
        
        cursor.execute("""
            SELECT u.user_id, u.username, u.email, 
                   COUNT(t.transaction_id) AS transaction_count,
                   SUM(t.amount) AS total_spent
            FROM users u
            LEFT JOIN transactions t ON u.user_id = t.user_id
            GROUP BY u.user_id
        """)
        
        users = cursor.fetchall()
        return render_template('users.html', users=users)

    except pymysql.MySQLError as err:
        app.logger.error(f"Database error: {err}")
        abort(500, description="Database connection failed")
        
    except Exception as e:
        app.logger.error(f"Unexpected error: {e}")
        abort(500)
        
    finally:
        if 'connection' in locals() and connection.open:
            close_connection(connection)

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html', error=error.description), 500

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

#API Part

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    print("Received signup data:", data)
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not all([username, email, password]):
        return jsonify({"error": "All fields are required"}), 400

    try:
        connection = connect_to_database()
        with connection.cursor() as cursor:
            # Check if email already exists
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                return jsonify({"error": "Email already exists"}), 400

            # Hash the password using bcrypt
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

            # Insert new user into the database
            cursor.execute(
                "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
                (username, email, hashed_password.decode('utf-8'))
            )
            user_id = cursor.lastrowid

            # Create default account balances for the new user
            cursor.execute(
                """INSERT INTO user_accounts 
                (user_id, main_balance, savings_balance, credit_balance, reward_points)
                VALUES (%s, 0.00, 0.00, 0.00, 0)""",
                (user_id,)
            )
            connection.commit()

            return jsonify({
                "message": "Signup successful",
                "user_id": user_id,
                "username": username
            }), 201

    except Exception as e:
        print("Error during signup:", str(e))  # Detailed error log
        return jsonify({"error": str(e)}), 500
    finally:
        if 'connection' in locals() and connection.open:
            connection.close()

# Login endpoint
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    try:
        connection = connect_to_database()
        with connection.cursor() as cursor:
            cursor.execute("SELECT user_id, username, password FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()

            if not user:
                return jsonify({"error": "User not found"}), 404

            # Debug: Print stored hash and input password
            print("Stored hash:", user[2])
            print("Input password:", password)

            if bcrypt.checkpw(password.encode('utf-8'), user[2].encode('utf-8')):
                return jsonify({
                    "message": "Login successful",
                    "user_id": user[0],
                    "username": user[1]
                }), 200
            else:
                return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        print("Login error:", str(e))
        return jsonify({"error": "Internal server error"}), 500
    finally:
        connection.close()


def get_account_summary(user_id):
    connection = connect_to_database()
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT main_balance, savings_balance, 
                       credit_balance, reward_points
                FROM user_accounts
                WHERE user_id = %s
            """, (user_id,))
            result = cursor.fetchone()
            if result:
                return {
                    "main_balance": result[0],
                    "savings_balance": result[1],
                    "credit_balance": result[2],
                    "reward_points": result[3]
                }
            else:
                return {"error": "User not found"}
    finally:
        connection.close()

# API endpoint for account summary
@app.route('/api/account/<int:user_id>', methods=['GET'])
def account_summary(user_id):
    summary = get_account_summary(user_id)
    return jsonify(summary)

@app.route('/api/currentUser/<user_id>', methods=['GET'])
def userName(user_id):
    try:
        connection = connect_to_database()
        with connection.cursor() as cursor:
            cursor.execute("SELECT username FROM users WHERE user_id = %s", (user_id,))
            user = cursor.fetchone()
            if user:
                return jsonify({"username": user[0]}), 200
            else:
                return jsonify({"error": "User not found"}), 404
    except Exception as e:
        print("Error fetching username:", str(e))
        return jsonify({"error": "Internal server error"}), 500
    finally:
        connection.close()

@app.route('/api/upload-qr', methods=['POST'])
def upload_qr():
    if 'qr_image' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['qr_image']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    user_id = request.form.get('user_id')

    try:
        filename = secure_filename(file.filename)
        mime_type = file.mimetype
        
        connection = connect_to_database()
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO user_qr_codes 
                (user_id, image_data, filename, mime_type)
                VALUES (%s, %s, %s, %s)
            """, (user_id, file.read(), filename, mime_type))
            connection.commit()
        
        return jsonify({"message": "QR code uploaded successfully"}), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        connection.close()

@app.route('/api/user-qr/<int:user_id>')
def get_user_qr(user_id):
    try:
        connection = connect_to_database()
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT image_data, mime_type FROM user_qr_codes
                WHERE user_id = %s
                ORDER BY uploaded_at DESC
                LIMIT 1
            """, (user_id,))
            qr = cursor.fetchone()
            if not qr:
                return '', 404  # Or return a default image

            image_bytes = qr[0]
            mime_type = qr[1]
            return send_file(io.BytesIO(image_bytes), mimetype=mime_type)
    except Exception as e:
        return str(e), 500
    finally:
        connection.close()


if __name__ == "__main__":
    app.run(debug=True)