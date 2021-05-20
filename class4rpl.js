// DATA TYPE: ARRAY
var listOfNumbers = [1,4,3,2,4,5] // List of integers

// Add items to list:
listOfNumbers.push(0)
// Updates items within the list:
listOfNumbers[0] = 99;
listOfNumbers[1] = 300;
// Remove items from the list:
listOfNumbers.pop()
console.log(listOfNumbers)
// Check number of items in list:
console.log(listOfNumbers.length)

// Iteration, going through the list:
var i
var newList = ["Hello", "my", "name", "is", "Prajwal"]
for(i=0; i < listOfNumbers.length; i++) {
	console.log(newList[i])
}

// Calculator;
var testCase1 = "3x5";
var testCase2 = "4+10";
var testCase3 = "90/9";

// + means addition, x means multiplication, - means substraction, / means division 
function calculator(input) {
    // Step 1: iterate through the string, make the string into a list 
    var listOfLetters = input.split("")
    
    // Step 2: figure out what is the operator being inputted
    var operator = listOfLetters[1]
    
    // Step 3: to "parse" the numbers into actual numbers
    var firstNumber = parseInt(listOfLetters[0])
    var secondNumber = parseInt(listOfLetters[2])
    
    // Step 4: bunch of if statements
    	var result;
    	if (operator == "x") {
      	result = firstNumber * secondNumber;
      } else if (operator == "/") {
      	result = firstNumber / secondNumber;
      } else if (operator == "+") {
      	result = firstNumber + secondNumber;
      } else if (operator == "-") {
      	result = firstNumber - secondNumber;
      } else {
      	result = "Invalid";
      }
      return result;
}
console.log(calculator(testCase1))
console.log(calculator(testCase2))
console.log(calculator(testCase3))