<?php
	////////////////////////////////////
	//	Written By	: Jake Brown      //
	//	Copy Right	: Jake Brown 2015 //
	//	Title		: register.php	  //
	////////////////////////////////////
	
	$usr = "acronympass";
	$pass = "Comp3008!";
	$hostname = "acronympass.db.10822525.hostedresource.com";
	$usertable = "users";
	$dbname = "acronympass";
	
	
	mysql_connect($hostname, $usr, $pass) OR DIE ("Unable to 
    connect to database! Please try again later.");
    mysql_select_db($dbname);

	$username = $_GET['username'];
	$password = $_GET['password'];
	$phrase  = $_GET['phrase'];
	
	$check_already_user = "SELECT * FROM $usertable WHERE username = '$username';";
	$result = mysql_query($check_already_user) or die(mysql_error());
	
	if(mysql_num_rows($result) > 0){
		// Username is already taken
		echo "exists";
	}else{
		// Username is available
		$new_user = "INSERT INTO $usertable (username, password, phrase) VALUES ('$username', '$password', '$phrase');";
		$result = mysql_query($new_user) or die(mysql_error());
		if($result){
			echo "registered";
		}else{
			echo "error";
		}
	}
   	
?>