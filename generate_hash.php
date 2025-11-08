<?php
$password = '@admin_';
$hash = password_hash($password, PASSWORD_DEFAULT);
echo "Password Hash for '$password': " . $hash;
?>