'use strict';

function switchState(description, type, element){

	element.className = "label label-"+type;
	element.innerHTML = description;

}

function DisplayAndHiddenDiv(DivId, type) {
	var currentDiv = document.getElementById(DivId);
	if (type == "display") {
	        currentDiv.style.visibility = 'visible';
	    }
	else if (type == "hidden") {
	        currentDiv.style.visibility = 'hidden';
	    }
	else{
		console.log("error from DisplayAndHiddenDiv()!!!");
	}
}