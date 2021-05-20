// This is a comment, we are starting JavaScript!

// Data Types
// 1) integers/numbers 2) strings/text 3) boolean (True/False) 4) List/Arrays 5) Object 6) Function

// Variables
let x = 1;
let y = 2;

// Printing to Console
console.log("hello!")
console.log(x + y)

console.log(x * 2)

function add(num1, num2) {
  return num1 + num2
}

console.log(add(10, 7))

// I want this function to triple whatever input you give this function
function triple(num1) {
  // what code goes here....
  return num1 * 3

}

console.log(triple(6)) // expect result of 18

function square(num1) {
  // ...
  return num1 ** 2
}

console.log(square(5)) // expect result of 25
console.log(square(10)) // expect result of 100
console.log(square(2)) // expect result of 4

// pseudocode, roughly coding in English

function mysteryFunction(num1) {
  if (num1 == 10) {
    return num1 + 5;
  } else {
    return num1 - 5;
  }
}



console.log(mysteryFunction(10))
console.log(mysteryFunction(16))



function mysteryFunction2(num1) {
  if (num1 == 9) {
    return num1 + 5;
  } else if (num1 < 5) {
    return num1 - 5;
  } else {
    return 0;
  }
}



console.log(mysteryFunction2(9))
console.log(mysteryFunction2(5))

// if grade is 90 or greater, then return an "A"
// if grade is between 80 and 90, then return an "B"
// if grade is between 70 and 80, then return an "C"
// if grade is between 60 and 70, then return an "D"
// if grade is less than 60, then return an "FAIL"
// HINT: you have to use a lot of if and if-else statements
function reportCard(grade) {
  if (grade >= 90) {
    return "A"
  } else if (grade >= 80) {
    return "B"
  } else if (grade >= 70) {
    return "C"
  } else if (grade >= 60) {
    return "D"
  } else {
    return "FAIL"
  }
}

console.log(reportCard(86))
