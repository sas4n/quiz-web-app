/* eslint-disable quote-props */
/* eslint-disable quotes */
let nickname
let answer
let answerButtonClicked = false
let userTime = 0
let isMultipleChoice = false
let url = 'https://courselab.lnu.se/quiz/question/1'

const timer = document.querySelector('.timer')
const instruction = document.querySelector('.instruction')
const nicknameTextField = document.querySelector('.user-name')
const questionText = document.querySelector('.question-text')
const questionButton = document.querySelector('.question-btn')
const answerButton = document.querySelector('.answer-btn')
const answerTextField = document.querySelector('.answer')
const radioButtons = document.querySelectorAll('[name = "radio-btn"]')
const radioButtonLabels = document.querySelectorAll('[name = "radio-btn-label"]')
const radioButtonsContainer = document.querySelector('.multiple-answer')
const messageAfterAnswer = document.querySelector('.message-after-answer')
const gameMessage = document.querySelector('.game-message')
const resetButton = document.querySelector('.reset')
const tableBody = document.querySelector('tbody')
const tableDataRows = tableBody.querySelectorAll('tr')
const highscoreContainer = document.querySelector('.highscore-container')

/**
 * This function disable the button if the relevant textfield is empty.
 *
 * @description
 * @param {Element} textfeild This could be either textfield for nickname or for answer.
 * @param {Element} button This could be either start button or submit button.
 */
const textFieldHandler = (textfeild, button) => {
  if (textfeild.value === '') {
    button.disabled = true
  } else {
    button.disabled = false
    if (textfeild === nicknameTextField) {
      nickname = textfeild.value
    } else if (textfeild === answerTextField) {
      answer = textfeild.value
    }
  }
}

nicknameTextField.addEventListener('input', () => textFieldHandler(nicknameTextField, questionButton))

questionButton.addEventListener('click', async () => {
  startTimer()
  questionButton.textContent = 'Next Question'
  hideElements(questionButton, messageAfterAnswer, nicknameTextField, instruction)

  const response = await getResponse(url)
  const data = await response.json()
  const question = data.question
  questionText.textContent = question
  showElements(questionText, answerButton)
  showCorrectFormOfQuestion(data)
  url = data.nextURL
})

answerTextField.addEventListener('input', () => textFieldHandler(answerTextField, answerButton))

answerButton.addEventListener('click', async function submitEvent () {
  answerButtonClicked = true
  hideElements(timer)
  const answer = userAnswerHandler()
  const body = {
    "answer": answer
  }
  try {
    const response = await sendAnswer(url, body)
    const data = await response.json()
    messageAfterAnswer.textContent = data.message
    showElements(questionButton, messageAfterAnswer)
    hideElements(...radioButtons, ...radioButtonLabels, radioButtonsContainer, answerButton, questionText)
    if (data.nextURL === undefined) {
      userWon()
    }
    url = data.nextURL
  } catch (error) {
    errorHandler(error)
  }
  answerTextField.value = ''
  answerButton.disabled = true
})

resetButton.addEventListener('click', () => {
  location.reload()
})

/**
 * This function take the url and fetch the data using it.
 *
 *@description
 * @param {string} url the url is a string that use for fetching data.
 * @returns {Promise} response
 */
const getResponse = async (url) => {
  const response = await fetch(url)
  return response
}

/**
 * This function send the data to the specified url and receive the response.
 *
 * @description
 * @param {string} url This string provide the url that data need to be send to.
 * @param {string} body This is the answer provided by user.
 * @returns {Promise} response
 */
const sendAnswer = async (url, body) => {
  const data = {
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": JSON.stringify(body)
  }
  const response = await fetch(url, data)
  if (response.status !== 200) {
    if (response.status !== 400) {
      throw new Error(`The error status is ${response.status}`)
    } else {
      const data = await response.json()
      throw new GameOverError(`${data.message}. You lost`)
    }
  }
  return response
}

/**
 * This function show choose between two type of question. 1-Textfield 2- Multiple-choice.
 *
 * @description
 * @param {Promise} data This is a promise which later could be check if it has alternative object or not.
 */
const showCorrectFormOfQuestion = async (data) => {
  if (data.alternatives === undefined) {
    isMultipleChoice = false
    showElements(answerTextField)
  } else {
    radioButtonsContainer.classList.remove('hidden')
    isMultipleChoice = true
    for (let i = 0; i < Object.keys(data.alternatives).length; i++) {
      showElements(radioButtons[i], radioButtonLabels[i])
      radioButtons[i].checked = false
      radioButtons[i].addEventListener('input', () => { textFieldHandler(radioButtons[i], answerButton) })
      radioButtonLabels[i].textContent = data.alternatives[`alt${i + 1}`]
    }
  }
}

/**
 * This function handles the answer from multiplechoice or textfield.
 *
 * @description
 *@returns {string} answer
 */
const userAnswerHandler = () => {
  if (isMultipleChoice) {
    for (let i = 0; i < radioButtons.length; i++) {
      if (radioButtons[i].checked) {
        answerButton.disabled = false
        answer = radioButtons[i].value
      }
    }
  } else {
    answerTextField.classList.add('hidden')
  }
  return answer
}

/**
 * This function save the user information in localStorage.
 *
 * @description
 */
const saveUserInfo = () => {
  const localStorageValue = localStorage.getItem(nickname)
  console.log(localStorage)
  if (localStorageValue == null || userTime < localStorageValue) {
    localStorage.setItem(nickname, JSON.stringify(userTime))
  }
}

/**
 * This function takes error object as input and handle the error.
 *
 * @description
 * @param {Error} error The error input is an object which its message will be shown on the page.
 */
const errorHandler = (error) => {
  gameMessage.textContent = error.message
  showElements(resetButton)
  answerButton.disabled = true
}

/**
 * This function uses for starting and resetting the timer and since it is asynchronous, try and catching the error
 * should happen inside the setInterval.
 * the reason for answerButtonClicked is to check if answer submitted before 10 seconds.
 *
 * @description
 * @param {Error} error The error would be GameOverError, only to check if user is out of time.
 */
const startTimer = (error) => {
  showElements(timer)
  answerButtonClicked = false
  let startTime = 9
  const countDown = setInterval(() => {
    timer.textContent = startTime
    if (startTime <= 0 && !answerButtonClicked) { // If timer reach to zero while user did not submit the answer.
      try {
        clearInterval(countDown)
        throw new GameOverError('Your time is up!. Try to be faster next time.')
      } catch (error) {
        errorHandler(error)
      }
    } else if (startTime > 0 && answerButtonClicked) { // If submit button clicked before timer shows 0.
      clearInterval(countDown)
    } else if ((!error) instanceof GameOverError) {
      clearInterval(countDown)
    } else {
      userTime++
      startTime--
    }
  }, 1000)
}

/**
 *
 */
class GameOverError extends Error {
  /**
   * The constructor only takes a single argument which is a message and pass it to super class
   * to use for handeling error.
   *
   * @description
   * @param {string} message This is a string to show the message of the error if required.
   */
  constructor (message) {
    super(message)
    this.name = 'GameOverError'
  }
}

/**
 * This function is a dynamic way to hide elements. It can handle 1 or more elements. It can avoid repeating element.classList.add('hidden').
 *
 *@description
 */
function hideElements () {
  Array.from(arguments).forEach(element => {
    element.classList.add('hidden')
  })
}

/**
 *This function is a dynamic way to show elements. It can handle 1 or more elements. It can avoid repeating element.classList.remove('hidden').
 *
 @description
 */
function showElements () {
  Array.from(arguments).forEach(element => {
    element.classList.remove('hidden')
  })
}

/**
 * This function is for taking care of everything happens after user successfully finish the quiz.
 *
 *@description
 */
const userWon = () => {
  saveUserInfo()
  hideElements(questionButton)
  gameMessage.textContent = `Wow ${nickname} you won!! You finishe the quiz in ${userTime} seconds, that is amazing`
  showElements(resetButton)
  showHighScore()
}

/**
 * These are what happens in this function:
 * -Iterate through all localStorage objects and create a new object using its key and value.
 * -Put all objects in an array.
 * -Sort the array so later users with lower time would be first in the array.
 * -finally shows all data in form of a table where basically is our highscore table.
 *
 *@description
 */
const showHighScore = () => {
  const dataArray = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    const obj = {
      key: key,
      value: localStorage.getItem(key)
    }
    dataArray.push(obj)
  }
  dataArray.sort(compare)
  for (let i = 0; i < tableDataRows.length; i++) {
    const tableData = tableDataRows[i].querySelectorAll('td')
    tableData[0].textContent = i + 1
    tableData[1].textContent = dataArray[i].key
    tableData[2].textContent = dataArray[i].value
  }
  showElements(highscoreContainer)
}

/**
 * This is a helper function which is the logic for sorting the array. More information
 * could be find in https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort.
 *
 * @description
 * @param {object} firstObject This is the first object which is basically user's nickname and time.
 * @param {object} secondObject This is the second object which is basically user's nickname and time.
 * @returns {number} The return value is the difference between time of first object and second object.
 */
function compare (firstObject, secondObject) {
  return firstObject.value - secondObject.value
} // response
// const response = fetch(questionUrl).then(res => res.json()).then(data => data.question).
