const dotenv = require('dotenv')
const axios = require('axios')
const express = require('express')
const app = express()
const port = 3000



// const getGithubRepoCommits = async () => {
//     try { 
//         const response = await axios.get('https://api.github.com/repos/abdulwahabmoosa/blockchain_project/commits')
//         console.log(response.data)
//         return response.data
//     } catch (error) {
//         console.error('Error fetching Github repos:', error)
//     }
// }


dotenv.config() 



app.get('/', (req, res) => {
    res.send('Hello World from backend!')
  })
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })

  app.get('/test-github', async (req, res, next) => {
    try {
        const response = await axios.get('https://api.github.com/repos/moemaliik/Realtime-ASL/commits')
        
        res.send(response.data)
    } catch (error) {
        res.status(500).send('Error fetching Github repos:', error)
    }
   
  })    




