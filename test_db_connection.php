<?php
// Test database connection and PHP configuration
echo "<h2>PHP Configuration Test</h2>";

echo "<h3>PHP Version:</h3>";
echo phpversion() . "<br><br>";

echo "<h3>Loaded Extensions:</h3>";
$extensions = get_loaded_extensions();
sort($extensions);
echo implode(", ", $extensions) . "<br><br>";

echo "<h3>PDO Drivers Available:</h3>";
if (extension_loaded('pdo')) {
    echo "PDO is loaded<br>";
    $drivers = PDO::getAvailableDrivers();
    if (empty($drivers)) {
        echo "<strong style='color:red;'>No PDO drivers found!</strong><br>";
    } else {
        echo "Available drivers: " . implode(", ", $drivers) . "<br>";
    }
} else {
    echo "<strong style='color:red;'>PDO extension is NOT loaded!</strong><br>";
}

echo "<h3>PDO MySQL Specific:</h3>";
if (extension_loaded('pdo_mysql')) {
    echo "<strong style='color:green;'>✓ pdo_mysql extension is loaded</strong><br>";
} else {
    echo "<strong style='color:red;'>✗ pdo_mysql extension is NOT loaded</strong><br>";
}

echo "<h3>Testing Database Connection:</h3>";
$host = "localhost";
$database = "attendance-db";
$user = "root";
$password = "";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<strong style='color:green;'>✓ Database connection successful!</strong><br>";
} catch (PDOException $e) {
    echo "<strong style='color:red;'>✗ Connection failed: " . $e->getMessage() . "</strong><br>";
    
    // Try connection without database name first
    try {
        $pdo = new PDO("mysql:host=$host", $user, $password);
        echo "<strong style='color:orange;'>⚠ Connection to MySQL server works, but database '$database' might not exist</strong><br>";
    } catch (PDOException $e2) {
        echo "<strong style='color:red;'>✗ Cannot connect to MySQL server either: " . $e2->getMessage() . "</strong><br>";
    }
}

echo "<h3>php.ini Location:</h3>";
echo php_ini_loaded_file() . "<br>";
echo "Additional ini files: " . php_ini_scanned_files() . "<br>";
?>

