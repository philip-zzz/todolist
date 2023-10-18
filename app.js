//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");

//import mongoose module
const mongoose = require("mongoose");

//import lodash module
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// const items = ["Buy Food", "Cook Food", "Eat Food"];
// const workItems = [];

//create a new database in mongoDB
mongoose.connect("mongodb+srv://admin-philip:test123@cluster0.lzwc0ny.mongodb.net/todolistDB", { useNewUrlParser: true });

//create a new schema
const itemsSchema = new mongoose.Schema({
  name: String
})

//create a new mongoose model, usually capitalized
const Item = mongoose.model("Item", itemsSchema)

const item1 = new Item({
  name: "Welcome to your todolist."
})

const item2 = new Item({
  name: "His the + button to add a new item."
})

const item3 = new Item({
  name: "<-- hit this to delete an item"
})

//create a arrey for default items
const defaultItems = [item1, item2, item3]


//create a new Schema for custom list, items Schema is embeded in custom list Schema
const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema] 
})

//create a new model for List
const List = mongoose.model("List", listSchema)



app.get("/", function(req, res) {

  Item.find({}) //因为是要find all default docuent, 所以condition的{}是空的
    .then(function(foundItems){  //foundItems是一个arrey
      //如果foundItems是0，代表现在的database是空的，那就可以insert defaultItems
      //到arrey中。如果不为0代表database已经有了数据，不需要再insert
      if (foundItems.length === 0){
        Item.insertMany(defaultItems)
          .then(()=>{
            console.log("Successfully saved default items to DB")
            res.redirect("/") 
            //this means after insert default items, it will redirect the page to "/", and run this whole block code again, but this time because there are already default items, it will fall into ELSE part, and render the items to show on the webpage
          })
          .catch((err)=>{
            console.log(err)
          })
      } else {
        //如果foundItems不等于0，会来到else，render the list on the webpage
        // console.log(foundItems);
        res.render("list", {listTitle: "Today", newListItems: foundItems});
      }
    })      
    .catch((err)=>{
      console.log(err)
    })

});


app.get("/:customListName", (req,res)=>{
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({name: customListName})
    .then(function(foundlist){  //"foundlist" 得到的是在lists这个collection里name是customListName的这个document
      if (!foundlist){  //check to see if "foundlist" exist or not
        //not exist yet, Create a new list
        console.log("Doesn't Exist")
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save()
          .then(()=>{
            console.log("new list saved successfully")
            res.redirect("/"+customListName)  //after saved redirect to the custom list page
          })
          .catch((err)=>{
            console.log(err)
          })
      } else {
        //already exist, render the list.ejs file
        console.log("Already exist")
        res.render("list.ejs", {listTitle: foundlist.name, newListItems: foundlist.items} )
      }
    })
    .catch((err)=>{
      console.log(err)
    })

})


app.post("/", function(req, res){

  const itemName = req.body.newItem; //这个是用户输入到表格里，点了+号后的内容
  const listName = req.body.list;  //ejs file中button的name是list，得到的value = listTitle, 当前页面custom list的title
  
  const newItem = new Item ({
    name: itemName
  });

  if (listName === "Today") { //说明是default page
    newItem.save();  //this will save the newItem into the collection
    res.redirect("/"); //after newItem added into collection, redirect to "/", then it will find() all documents, and render them so they will show on webpage
  } else { 
    //如果不是default page，那么我们要先在database的List Model里找到这个list document， 用findOne()
    List.findOne({name: listName})
      .then(function(foundList){
        foundList.items.push(newItem);  
        //foundList是List collection里的一个document，根据Schema我们知道这个document有name和items两个field，items field就是这个list的item。那我们把新创建的这个item push到这个list的最后面，然后save。最后redirect到"/:customListName"这个界面重新render
        foundList.save();
        res.redirect("/"+listName)
      })
      .catch((err)=>{
        console.log(err)
      })
  }
});


app.post("/delete", (req, res)=>{
  const checkedItemId = req.body.check; 
  //check是我们再ejs中给checkbox的名字name，然后我们给了他value attribute是这个数据的id。所以这个req.body.check得到的就是被check的item的id。通过找这个id来从database里删除它
  const listName = req.body.listName;

  if (listName === "Today"){
    Item.findByIdAndDelete(checkedItemId) //这个mathods会从database里删掉这个record，但是webpage不会变
      .then(()=>{
        console.log("Item deleted successfully.")
        res.redirect("/")
        //所以最后要redirect回 "/"， 会重新find所有的record，然后reder list
      })
      .catch((err)=>{
        console.log(err)
      })
  } else {
    //先在List model里找到name是listName的collection，然后根据Schema，知道items是个arrey，通过$pull，把这个arrey中_id等于checkedItemId的这个item删掉
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}})
      .then(()=>{
        console.log("Deleted successfully")
        res.redirect("/"+listName)
      })
      .catch((err)=>{
        console.log(err)
      })
  }
})


app.get("/work", function(req,res){
  res.render("list", {listTitle: "Work List", newListItems: workItems});
});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
