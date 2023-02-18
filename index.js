const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const exerciseSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String 
});

const userSchema = new mongoose.Schema({
  username: {type: String, required: true}, 
  log : [exerciseSchema]
});

const Exercise = mongoose.model('Exercise', exerciseSchema); 

const User = mongoose.model('User', userSchema); 

app.post('/api/users', bodyParser.urlencoded({ extended: true }), (req, res) => {
  let username = req.body.username;
  if (!username || username.length === 0) {
    return res.json({ error: "Input username is invalid." });
  }
  
  let createNewUser = new User({username: username});
  createNewUser.save((err, savedNewUser) => {
    if (!err) {
      return res.json({"username": savedNewUser.username, "_id": savedNewUser['_id']});
    }
    return console.log('Create new user error:',err);
  })
})

app.get('/api/users', (req, res) => {
  User.find({}, (err, allUsers) => {
    if (!err) {
      return res.json(allUsers); 
    }
    return console.log('Get users list error:',err);
  })
})

app.post('/api/users/:_id/exercises', bodyParser.urlencoded({ extended: true }), (req, res) => {

  let userId = req.params['_id'] || req.body[':_id']; 
  
  let newExercise = new Exercise({
    description: req.body.description, 
    duration: req.body.duration, 
    date: req.body.date
  });
  
  if (Date.parse(newExercise.date)) {
    newExercise.date = new Date(newExercise.date).toISOString().substring(0,10);
  } else {
    newExercise.date = new Date().toISOString().substring(0,10);
  }
  
  User.findByIdAndUpdate(userId, {$push: {log: newExercise}}, {new: true}, (err, userUpdated) => {
   if (!err) {
    let responseObj = {"username": userUpdated.username, "_id": userId, "description": newExercise.description, "duration": newExercise.duration, "date": new Date(newExercise.date).toDateString()};

     return res.json(responseObj);
   }
    return console.log('Find by id and update error:',err);
  })
})

app.get('/api/users/:_id/logs', (req, res) => {
  User.findById(req.params['_id'], (err, foundDoc) => {
    if (!err) {
      let foundDocument = {'_id': foundDoc['_id'], 'username': foundDoc.username, 'count': foundDoc.log.length, 'log': foundDoc.log.map((exerciseObj) => {
        let filterObj = {};
        filterObj['description'] = exerciseObj.description;
        filterObj['duration'] = exerciseObj.duration;
        filterObj['date'] = new Date(exerciseObj.date).toDateString();
        return filterObj;})}

      if (req.query.from || req.query.to) {
        let fromDate = new Date(0);
        let toDate = new Date();

        if (req.query.from) {
          fromDate = new Date(req.query.from);
        }

        if (req.query.to) {
          toDate = new Date(req.query.to);
        }
        
        fromDate = fromDate.getTime();
        toDate = toDate.getTime();

        foundDocument.log = foundDocument.log.filter((exercise) => {
          let exerciseDate = new Date(exercise.date).getTime();
          return exerciseDate >= fromDate && exerciseDate <= toDate;
        })
      }

      if (req.query.limit) {
        foundDocument.log = foundDocument.log.slice(0, req.query.limit);
      } 
      
      return res.json(foundDocument);
    }
    return console.log('Find exercises log error:',err);
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})