<?php

$host = "localhost";

//your database name
$database = "attendance-db";

//database user which by default is root unless you have configured with another name
$user = "root";

//password as empty string
$password = "";

// Check if PDO MySQL driver is available
if (!in_array('mysql', PDO::getAvailableDrivers())) {
    die("PDO MySQL driver is not available. Please enable the 'pdo_mysql' extension in php.ini");
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    // Set PDO error mode to exception for better error handling
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    // Provide more helpful error messages
    $errorMessage = $e->getMessage();
    
    if (strpos($errorMessage, 'could not find driver') !== false || 
        strpos($errorMessage, 'unknown driver') !== false) {
        die("Database Connection Error: PDO MySQL driver not found.<br><br>" .
            "Please enable the 'pdo_mysql' extension in your php.ini file:<br>" .
            "1. Open: " . php_ini_loaded_file() . "<br>" .
            "2. Find the line: ;extension=pdo_mysql<br>" .
            "3. Remove the semicolon to make it: extension=pdo_mysql<br>" .
            "4. Restart Apache server in XAMPP<br>" .
            "5. Check loaded extensions at: <a href='test_db_connection.php'>test_db_connection.php</a>");
    } elseif (strpos($errorMessage, 'Access denied') !== false) {
        die("Database Connection Error: Access denied. Please check your database username and password.");
    } elseif (strpos($errorMessage, "Unknown database") !== false) {
        die("Database Connection Error: Database '$database' does not exist.<br><br>" .
            "Please create the database by importing the SQL file: database/attendance-db.sql");
    } else {
        die("Connection failed: " . $errorMessage);
    }
}
