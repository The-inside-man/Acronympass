var counter = 0;
var errors = null;
var step = 0;
var step2 = 0;
var timer = null;
var reg_timer = null;
var speed = 15;
var password = "";
var confirmed_value = "";
var username = "";
var newusername = "";
var str = "";
var new_password = "";
var back_timer = null;
var checked = false;
var con_value = "";
var phrase = "";
var login_timer = null;
var login_time = 0;
var part1 = "";
var part2 = "";
var part3 = "";
var part4 = "";
var part5 = "";
var part6 = "";
var time_dif = 0;


var width = window.innerWidth
|| document.documentElement.clientWidth
|| document.body.clientWidth;

function generate_acro(){
	var elem = document.getElementById("acro");
	var alpha = 	["A","B","C","D","E","F","G","H",
					"I","J","K","L","M","N","O","P",
					"Q","R","S","T","U","V","W","X",
					"Y","Z"]
	var acro = "";
	for(var i = 0; i < 6; i ++){
		var res = Math.floor(Math.random()*26);
		acro += alpha[res];
	}
	elem.innerHTML = acro;
	new_password = acro;
}

function clear_fields(){
	var field1 = document.getElementById("new_acro1");
	var field2 = document.getElementById("new_acro2");
	var field3 = document.getElementById("new_acro3");
	var field4 = document.getElementById("new_acro4");
	var field5 = document.getElementById("new_acro5");
	var field6 = document.getElementById("new_acro6");
	
	field1.value = "";
	field2.value = "";
	field3.value = "";
	field4.value = "";
	field5.value = "";
	field6.value = "";
	
	field1.style.backgroundColor = "#dce0e6";
	field2.style.backgroundColor = "#dce0e6";
	field3.style.backgroundColor = "#dce0e6";
	field4.style.backgroundColor = "#dce0e6";
	field5.style.backgroundColor = "#dce0e6";
	field6.style.backgroundColor = "#dce0e6";
	
	document.getElementById("newusername").style.backgroundColor = "#dce0e6";
}

function set_acro_fields(){
	var field1 = document.getElementById("new_acro1");
	var field2 = document.getElementById("new_acro2");
	var field3 = document.getElementById("new_acro3");
	var field4 = document.getElementById("new_acro4");
	var field5 = document.getElementById("new_acro5");
	var field6 = document.getElementById("new_acro6");
	
	field1.value = new_password.charAt(0);
	field2.value = new_password.charAt(1);
	field3.value = new_password.charAt(2);
	field4.value = new_password.charAt(3);
	field5.value = new_password.charAt(4);
	field6.value = new_password.charAt(5);
}

function add_box(){
	var newdiv = document.createElement('div');
	var blank = document.getElementById("textbox");
	if(blank.value.length >= 4){
	counter++;
	newdiv.style.height = '40px';
	newdiv.style.backgroundColor = 'black';
	newdiv.innerHTML = " <br><input type='text' id='textBoxF' type='input' name='inputs[]' onclick='add_box();'>";
  	document.getElementById("boxes").appendChild(newdiv);
  	get_character(newdiv);
  	}
  	if(counter == 4){
  		document.getElementById("login_butt").style.visibility = 'visible';
  	}	
}

function username_set(elem){
	
	if(login_timer == null){
		start_login_timer();
	}

	check_username(elem);
	username = elem.value;
	if(counter >= 6 && (username.length >= 6) && (checked == false)){
		document.getElementById("get_acro").disabled = false;
		checked = true;
	}
}

function newusername_set(elem){
	newusername = elem.value;
	check_newusername(elem);
}

function clicked(elem){
	if(document.getElementById("clear").disabled == false){
		
		if(login_timer == null){
			start_login_timer();
		}
	
		if(password.length < 6){
			password += elem.innerHTML;
			counter ++;
			if(counter >= 6 && (username.length >= 6) && (checked == false)){
				document.getElementById("get_acro").disabled = false;
				checked = true;
			}
		}
	}
}

function get_random_char(){
	var pos = Math.floor(Math.random() * password.length);
	var ret = password.charAt(pos);
	document.getElementById("char_val").innerHTML = ret;
}

function start_reg_timer(elem){
	reg_timer = setInterval(animate_reg_field, 20);
	get_random_char();
	elem.disabled = true;
	document.getElementById("username").disabled = true;
}

function start_timer(elem){
	timer = setInterval(animate_field, 20);
	get_random_char();
	elem.disabled = true;
	document.getElementById("username").disabled = true;
	document.getElementById("clear").disabled = true;
}

function animate_reg_field(){
	generate_acro();
	elem = document.getElementById("register_div");
	step2 += speed;
	elem.style.left = step2.toString() +'px';
	if(step2 >= ((width/2))*0.3){
		speed = 10;
	}
	if(step2 >= ((width/2))*0.4){
		speed = 9;
	}
	if(step2 >= ((width/2))*0.5){
		speed = 8;
	}
	if(step2 >= ((width/2))*0.6){
		speed = 5;
	}
	if(step2 >= ((width/2))*0.7){
		speed = 3;
	}
	if(step2 >= ((width/2))*0.8){
		speed = 2;
	}
	if(step2 >= ((width/2))*0.9){
		speed = 1;
	}
	if(step2 >= (width/2) - (elem.offsetWidth/2)){
		clearInterval(reg_timer);
		set_acro_fields();
	}
}

function start_rmv(elem){
	register_new_user(elem);
	back_timer = setInterval(remove_reg_field, 20);
	elem.disabled = true;
	document.getElementById("newusername").disabled = true;
}

function remove_reg_field(){
	elem = document.getElementById("register_div");
	step2 -= speed;
	elem.style.left = step2.toString() +'px';
	if((step2 < ((width/2)) * 0.9) && (step2 > ((width/2)) * 0.8)){
		speed = 3;
	}
	if((step2 < ((width/2)) * 0.8) && (step2 > ((width/2)) * 0.7)){
		speed = 4;
	}
	if((step2 < ((width/2)) * 0.7) && (step2 > ((width/2)) * 0.6)){
		speed = 5;
	}
	if((step2 < ((width/2)) * 0.6) && (step2 > ((width/2)) * 0.5)){
		speed = 6;
	}
	if((step2 < ((width/2)) * 0.5) && (step2 > ((width/2)) * 0.4)){
		speed = 9;
	}
	if((step2 < ((width/2)) * 0.4) && (step2 > ((width/2)) * 0.3)){
		speed = 10;
	}
	if((step2 < ((width/2)) * 0.3) && (step2 > ((width/2)) * 0.1)){
		speed = 15;
	}
	if(step2 <= -275){
		clearInterval(back_timer);
		document.getElementById("newusername").value = "";
		document.getElementById("newusername").disabled = false;
		document.getElementById("register_butt").disabled = false;
		document.getElementById("username").disabled = false;
		clear_fields();
	}
}

function animate_field(){
	elem = document.getElementById("confirm_field");
	step += speed;
	elem.style.left = step.toString() +'px';
	if(step >= ((width/2))*0.3){
		speed = 10;
	}
	if(step >= ((width/2))*0.4){
		speed = 9;
	}
	if(step >= ((width/2))*0.5){
		speed = 8;
	}
	if(step >= ((width/2))*0.6){
		speed = 7;
	}
	if(step >= ((width/2))*0.7){
		speed = 6;
	}
	if(step >= ((width/2))*0.8){
		speed = 3;
	}
	if(step >= ((width/2))*0.9){
		speed = 2;
	}
	if(step >= ((width/2) - elem.offsetWidth/2)){
		clearInterval(timer);
	}
}

function square(elem){
	if(elem.style.backgroundColor == 'blue'){
		elem.style.backgroundColor = '#dce0e6';
	}else{
		elem.style.backgroundColor = 'blue';
	}
}

function call_login(elem) {

	var url = "login.php";
	url += "?username=";
	url += username;
	url += "&password="
	url += password;
	url += "&confirm=";
	url += con_value.toLowerCase();
	url += "&timediff=";
	url += time_dif;

  getRequest(
       url, 			// URL for the PHP file
       draw_output,  	// handle successful request
       draw_error,    	// handle error
       elem				// Element to display data
  );
  return false;
}  

function draw_error() {
    var container = document.getElementById('error_window');
    container.innerHTML = 'Notes From Server: There was an error!';
}


// handles response from php files
function draw_output(responseText, elem) {
    if(responseText == "success"){
    	alert("Successful Login! Thank you for using!");
    	location.reload();
    }else if(responseText == "failed"){
    	alert("Unsuccessful Login... Please Try again.");
    	location.reload();
    }else if(responseText == "registered"){
    	alert("Created New User... Please Login.");
    	location.reload();
    }else if(responseText == "exists"){
    	alert("Username already exists, Please try another");
    	location.reload();
    }else if(responseText == "max"){
    	alert("Too Many attempts...");
    	location.reload();
    }else{
    	alert("Unrecognized command... Error....");
    	alert(responseText);
    	location.reload();
    }
}

function getRequest(url, success, error, elem) {
    var req = false;
    try{
        // most browsers
        req = new XMLHttpRequest();
    } catch (e){
        // IE
        try{
            req = new ActiveXObject("Msxml2.XMLHTTP");
        } catch(e) {
            // try an older version
            try{
                req = new ActiveXObject("Microsoft.XMLHTTP");
            } catch(e) {
                return false;
            }
        }
    }
    if (!req) return false;
    if (typeof success != 'function') success = function () {};
    if (typeof error!= 'function') error = function () {};
    req.onreadystatechange = function(){
        if(req.readyState == 4) {
            return req.status === 200 ? 
                success(req.responseText, elem) : error(req.status);
        }
    }
    req.open("POST", url, true);
    req.send(null);
    return req;
}
function save_acro_values(){
	var field1 = document.getElementById("new_acro1");
	phrase += field1.value + ",";
	var field2 = document.getElementById("new_acro2");
	phrase += field2.value + ",";
	var field3 = document.getElementById("new_acro3");
	phrase += field3.value + ",";
	var field4 = document.getElementById("new_acro4");
	phrase += field4.value + ",";
	var field5 = document.getElementById("new_acro5");
	phrase += field5.value + ",";
	var field6 = document.getElementById("new_acro6");
	phrase += field6.value + ",";
	alert(phrase);
}

function check_acro(elem,num){
	if(elem.value.charAt(0) == new_password.charAt(num) && elem.value.length >= 2){
		elem.style.backgroundColor = "#0f3";
	}else{
		elem.style.backgroundColor = "#c02";
	}
	all_fields_set();
}

function check_username(elem){
	if(elem.value.length >= 6){
		elem.style.backgroundColor = "#0f3";
	}else{
		elem.style.backgroundColor = "#c02";
	}
}

function check_newusername(elem){
	if(elem.value.length >= 6){
		elem.style.backgroundColor = "#0f3";
	}else{
		elem.style.backgroundColor = "#c02";
	}
	all_fields_set();
}

function all_fields_set(){
	if(	document.getElementById("new_acro1").style.backgroundColor == "rgb(0, 255, 51)" &&
		document.getElementById("new_acro2").style.backgroundColor == "rgb(0, 255, 51)" &&
		document.getElementById("new_acro3").style.backgroundColor == "rgb(0, 255, 51)" &&
		document.getElementById("new_acro4").style.backgroundColor == "rgb(0, 255, 51)" &&
		document.getElementById("new_acro5").style.backgroundColor == "rgb(0, 255, 51)" &&
		document.getElementById("new_acro6").style.backgroundColor == "rgb(0, 255, 51)" &&
		document.getElementById("newusername").style.backgroundColor == "rgb(0, 255, 51)"){
		document.getElementById("register_butt").disabled = false;	
	}else{
		document.getElementById("register_butt").disabled = true;
	}
}

function open_users(){
	var obj = document.getElementById("char_val");
	call_login(obj);
}

function login(){
	con_value = document.getElementById("confirm_text").value;
	stop_login_timer();

	if (window.File && window.FileReader && window.FileList && window.Blob) {
		open_users();
	} else {
  		alert('The File APIs are not fully supported by your browser.');
	}
}

function clear_pass(){
	password = "";
	counter = 0;
	if(document.getElementById("get_acro").disabled == false){ 
		checked = false;
	}
	document.getElementById("get_acro").disabled = true;
}

function start_login_timer(){
	login_timer = setInterval(tick, 1);
}

function tick(){
	login_time ++;
}

function stop_login_timer(){
	clearInterval(login_timer);
	time_dif = login_time/1000;
	// instead of alert(time_dif); we need to log the information
}

function register_new_user(elem){
	call_register(elem);
}

function call_register(elem) {
	part1 = document.getElementById("new_acro1").value.toLowerCase();
	part2 = document.getElementById("new_acro2").value.toLowerCase();
	part3 = document.getElementById("new_acro3").value.toLowerCase();
	part4 = document.getElementById("new_acro4").value.toLowerCase();
	part5 = document.getElementById("new_acro5").value.toLowerCase();
	part6 = document.getElementById("new_acro6").value.toLowerCase();

	var url = "register.php";
	url += "?username=";
	url += newusername;
	url += "&password="
	url += new_password.toLowerCase();
	url += "&phrase=";
	url += part1 + "," + part2 + "," + part3 + "," + part4 + "," + part5 + "," + part6;
	
  getRequest(
       url, 			// URL for the PHP file
       draw_output,  	// handle successful request
       draw_error,    	// handle error
       elem				// Element to display data
  );
  return false;
}  
