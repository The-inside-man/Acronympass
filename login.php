<?php
	 header('Content-Type: application/json');
	////////////////////////////////////
	//	Written By	: Jake Brown      //
	//	Copy Right	: Jake Brown 2015 //
	//	Title		: login.php		  //
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
	$confirm  = $_GET['confirm'];
	$login_time  = $_GET['timediff'];
	
	$myfile = fopen("log.txt", "a");
   	
	if((isset($username))){
		$username = htmlspecialchars($username);
		$password = htmlspecialchars($password);
		$password = strtolower($password);
		$confirm = htmlspecialchars($confirm);
		$username = mysql_real_escape_string($username);
		$password = mysql_real_escape_string($password);
		$confirm = mysql_real_escape_string($confirm);
		
		$query  = "SELECT * FROM $usertable WHERE username = '$username' AND password = '$password';";
		$result = mysql_query($query) or die(mysql_error());
		
		if($result){
			$row = mysql_fetch_array($result);
			$count = intval($row["attempts"]);
			$phrase = $row["phrase"];
			
			$correct = false;
			
			$phrase_array = explode(',', $phrase);
			foreach($phrase_array as &$word){
				if(strcmp($word, $confirm) == 0){
					$correct = true;
				}
			}
			$num_rows = mysql_num_rows($result);
			if($num_rows > 0){
				// successfull
				if($correct){
					$set_zero = "UPDATE $usertable SET attempts = '0' WHERE username = '$username';";
					$zeroed = mysql_query($set_zero) or die(mysql_error());
					$txt = "succeeded,email,".$username.",".$password.",".$confirm.",".$login_time.",".$count."\n";
					fwrite($myfile, $txt);
					echo "success";
				}else{
					// unsuccessfull
					$count ++;
					if($count >= 3){
						echo "max";
					}else {
						$increase = "UPDATE $usertable SET attempts = '$count' WHERE username = '$username';";
						$increased = mysql_query($increase) or die(mysql_error());
						$txt = "failed,email,".$username.",".$password.",".$confirm.",".$login_time.",".$count."\n";
						fwrite($myfile, $txt);
						echo "failed";
					}
				}
			}
			else{
				// unsuccessfull
				$count ++;
				if($count >= 3){
					echo "max";
				}else {
					$increase = "UPDATE $usertable SET attempts = '$count' WHERE username = '$username';";
					$increased = mysql_query($increase) or die(mysql_error());
					$txt = "failed,email,".$username.",".$password.",".$confirm.",".$login_time.",".$count."\n";
					fwrite($myfile, $txt);
					echo "failed";
				}
			}
		}
		else
		{
		echo "failed";
		}
	}
	else{
		?>
        <script type="text/javascript">
            alert("Please make sure to fill in your Username");
            history.back();
        </script>
        <?php
	}
    
?>