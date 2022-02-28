const User = require('../models/user');
const Doctor = require('../models/doctor');
const Pharmacy = require('../models/pharmacy');
const jwt = require('jsonwebtoken');
const SECRET = process.env.SECRET;
const {
  v4: uuidv4
} = require('uuid');
const S3 = require('aws-sdk/clients/s3');
const s3 = new S3(); // initialize the constructors
// now s3 can crud on our s3 buckets

module.exports = {
  signup,
  login,
  profile
};

function signup(req, res) {

  // FilePath unique name to be saved to our bucket
  const filePath = `${uuidv4()}/${req.file.originalname}`
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: filePath,
    Body: req.file.buffer
  };
  //your bucket name goes where collector cat is 
  //////////////////////////////////////////////////////////////////////////////////
  s3.upload(params, async function (err, data) {
    const user = new User({
      ...req.body,
      photoUrl: data.Location
    });
    try {
      await user.save();
      const token = createJWT(user); // user is the payload so this is the object in our jwt
      res.json({
        token
      });
    } catch (err) {
      // Probably a duplicate email
      res.status(400).json(err);
    }



  })
  //////////////////////////////////////////////////////////////////////////////////

}

async function login(req, res) {
  try {
    const user = await User.findOne({
      email: req.body.email
    });
    if (!user) return res.status(401).json({
      err: 'bad credentials'
    });
    // had to update the password from req.body.pw, to req.body password
    user.comparePassword(req.body.password, (err, isMatch) => {

      if (isMatch) {
        const token = createJWT(user);
        res.json({
          token
        });
      } else {
        return res.status(401).json({
          err: 'bad credentials'
        });
      }
    });
  } catch (err) {
    return res.status(401).json(err);
  }
}

async function profile(req, res) {
  try {
    // First find the user using the params from the request
    // findOne finds first match, its useful to have unique usernames!
    const user = await User.findOne({
      username: req.params.username
    })
    // Then find all the posts that belong to that user
    if (!user) return res.status(404).json({
      err: 'User not found'
    })

    const doctors = await Doctor.find({
      user: user._id
    }).populate("user").exec();
    const pharmacies = await Pharmacy.find({
      user: user._id
    }).populate("user").exec();
    res.status(200).json({
      doctors: doctors,
      user: user,
      pharmacies: pharmacies
    })
  } catch (err) {
    console.log(err)
    res.status(400).json({
      err
    })
  }
}


/*----- Helper Functions -----*/

function createJWT(user) {
  return jwt.sign({
      user
    }, // data payload
    SECRET, {
      expiresIn: '24h'
    }
  );
}