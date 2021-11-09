const express = require('express')
const app = express()
const  cors = require('cors')
require('dotenv').config();
const { MongoClient } = require('mongodb');
app.use(cors());
app.use(express.json());
require('dotenv').config()

const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
async function verifyToken(req,res,next){
    if(req.headers?.authorization?.startsWith('Bearer ')){
        const token=req.headers.authorization.split(' ')[1]
        try{
            const decodeUser=await admin.auth().verifyIdToken(token);
        req.decodeEmail=decodeUser.email;
        }
        catch{
        
        }
        
        
    }
   
    next()
}


const port =  process.env.PORT|| 9000

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ou7jc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
async function run() {
    try {
        await client.connect();
        const database = client.db('doctorsApp');
        const patientCollection = database.collection('patients');
        const userCollection = database.collection('users');
        app.post('/appointments', async(req, res) => {
            const user = req.body;
            const result = await patientCollection.insertOne(user);
            res.json(result);
        });
        app.get('/appointments',verifyToken ,async(req, res) => {
            const email = req.query.email;
            const date = req.query.date;
            const query = { email: email, date:date}
            const cursor = patientCollection.find(query);
            const appointments = await cursor.toArray();
            res.json(appointments);
        });
        app.post('/users',async(req,res)=>{
            const user=req.body;
            const result=await userCollection.insertOne(user);
            res.json(result)
        })
        app.put('/users/admin',verifyToken ,async(req,res)=>{
            const user=req.body;
            const requester=req.decodeEmail;
            if(requester){
            const requesterAccount=await userCollection.findOne({email:requester})
            if(requesterAccount.role==='admin'){
                const filter={email:user.email}
                const updateDoc= { $set: { role: 'admin' } };
                const result=await userCollection.updateOne(filter,updateDoc);
                res.json(result)
            }
        
        }
           else{
               res.status(403).json({ message: 'you do not have access to make admin' })
           } 
           
        })
        app.put('/users',async(req,res)=>{
            const user=req.body;
            const filter={email:user.email}
            const options={upsert:true}
            const updateDoc = { $set: user }
            const result=await userCollection.updateOne(filter,updateDoc,options);
            res.json(result)
        })
        app.get('/users/:email',async(req,res)=>{
            const email=req.params.email;
            const query={email:email}
            let isAdmin=false;
            const user=await userCollection.findOne(query)
            console.log(user);
            if(user?.role=='admin'){
                isAdmin=true;
            }
            res.json({admin:isAdmin})
        })
    }
    finally {
        // await client.close();
    }
    
}    
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log('hello', port)
})