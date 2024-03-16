// there could be errors while interacting with database anytime so it always preffered
// to use most of the functionality in TRY CATCH block 
// Database is in another continent or far away from us so to retrive data it needs some time 
// so always use statements like ASYNC and AWAIT 

// require('dotenv').config({path: './env'});
import connectDB from "./db/index.js";
import dotenv from 'dotenv';
import { app } from "./app.js";

dotenv.config({
    path: './evn'
})

connectDB()
.then( () => {
    app.on('err', (err) => {
        console.log("express connection err : ",err);
        throw err;
    })
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`server running on port : ${process.env.PORT}`);
    })
})
.catch( (err) => {
    console.log("MongoDB connection failed !! ",err );
})








/*

import mongoose from "mongoose";
import { DB_NAME } from "./constants";

// This is also one of the way to connect the database to express and mongoose
import { express } from "express";

const app = express();

( async () => {
    
    try {
        
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("err", (err) => {
            console.log("err : ",err);
            throw err;
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening of port ${process.env.PORT}`);
        })

    } catch (error) {
        console.log(error);
        throw err;
    }
} )();

*/