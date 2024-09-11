  // imports
  import bodyParser from'body-parser'
  import express from 'express'
  import cors from 'cors'
  import mongoose from 'mongoose'
  import dotenv from 'dotenv'
  import dns from 'dns/promises'; 
  import { URL } from 'url';

  // basic configuration
  dotenv.config();
  const app = express();
  const port = process.env.PORT || 3000;
  // middlewares
  app.use(cors());
  app.use(bodyParser.urlencoded({extended:false}));
  app.use('/public', express.static(`${process.cwd()}/public`));
  // connect to the database
  mongoose.connect(process.env.MONGO_URI);

  // Schema for the database
  let urlSchema = new mongoose.Schema({
    original_url:{
      type: String,
      required: true
    },
    short_url:{
      type: Number,
      required: true
    }
  })
  // Model
  let ShortUrl = mongoose.model('ShortUrl',urlSchema);

  // Function to check if the URL is valid using a promise
  async function isValidUrl(inputUrl) {
    try {
      // Parse the input URL to extract the hostname
      const parsedUrl = new URL(inputUrl);
      const hostname = parsedUrl.hostname;

      // Use dns.lookup() to verify if the hostname has a valid DNS entry
      const result = await dns.lookup(hostname);
      console.log(`DNS lookup successful: ${hostname} resolves to ${result.address}`);
      
      // If lookup succeeds, return true
      return true;

    } catch (error) {
      // If there's an error during DNS lookup or URL parsing, it's not valid
      console.log(`Error: ${error.message}`);
      return false;
    }
  }

  // function to calculate the shortURL value to be given to the next URL
  async function getUrlId(){
    const count = await ShortUrl.countDocuments({});
    return count+1;
  }
  // function to find the URL in database if it already exists
  async function findUserByUrl(urlToFind){
    const user = await ShortUrl.findOne({original_url: urlToFind})
      return user;
  }
  // function to find the URL in database if it already exists
  async function findUserByShortUrl(short_url){
    const user = await ShortUrl.findOne({short_url: short_url})
    return user;
  }
  // function to save new url and its short_url
  async function createUser(urlToSave){
    const number = await getUrlId()
    let urlObject = {
      original_url: urlToSave,
      short_url : number
    }
    const newUrl =new ShortUrl(urlObject);
    const savedUrl = await newUrl.save()
    return savedUrl
  }

  // Check if the string matches the regular expression for a positive integer with no leading zeros
  function isValidPositiveInteger(str) {
    const regex = /^[1-9][0-9]*$/;
    return regex.test(str);
  }

  // post request through form
  app.post('/api/shorturl',async (req,res)=>{
    let URL = req.body.url;
    const isValid = await isValidUrl(URL);
    if(isValid)
    {
      const user = await findUserByUrl(URL);
      if(user)
      {
        res.json({
            original_url: user.original_url,
            short_url: user.short_url
        })
      }
      else
      {
        const new_user = await createUser(URL);
        res.json({
          original_url: new_user.original_url,
          short_url : new_user.short_url
        })
      }
    }
    else
    {
      res.json({
        error: "Invalid URL"
      })
    }
  })
  app.get('/api/shorturl/:url_id',async (req,res)=>{
    const short_url = req.params.url_id
    if(isValidPositiveInteger(short_url))
    {
      const user = await findUserByShortUrl(short_url);
      if(user)
      {
        res.redirect(user.original_url);
      }
      else
      {
        res.json({
            error: "No short URL found for the given input"
        })
      }
    }
    else
    {
      res.json({
        error: "Wrong format"
      })
    }
  })
  app.get('/', function(req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

  // Your first API endpoint
  app.get('/api/hello', function(req, res) {
    res.json({ greeting: 'hello API' });
  });

  app.listen(port, function() {
    console.log(`Listening on port ${port}`);
  });
