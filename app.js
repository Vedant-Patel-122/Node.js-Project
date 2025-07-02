const express = require('express');
require('dotenv').config({path:".env"});
const { Pool} = require('pg');
const app = express();
const path = require('path');


// const con = new Pool(
//     {
//         user: process.env.DB_USER,
//         host: process.env.DB_HOST,
//         database: process.env.DB_DATABASE,
//         password: process.env.DB_PASSWORD,
//         port: Number(process.env.DB_PORT)
//     }
// );

const con = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false // allows self-signed certificates
    }
});

con.connect()
    .then(() => {
        console.log('Successfully connection with postgreSQL');
    })
    .catch((err) => {
        console.log(err);
    })


app.use(express.static(path.join(__dirname, 'View', 'homepage'))); // this is used to serve static files like css, js, images etc.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'View'));
app.use(express.json()); // this is accept data in json format
app.use(express.urlencoded({ extended: false })); // it is used to decode the data send through html page

var total_salary = null;

app.get('/',(req,res)=>
{
    res.sendFile(path.join(__dirname, 'View', 'homepage.html'));
})




app.get('/insert', (req, res) => {

    const select_query = 'select * from employeedata';

    con.query(select_query, null, (err, result) => {
        if (err) {
            console.log(err);
            res.send('Database error');
        } else
        {
           
            res.render('insert.ejs', {employees: result.rows || []});
           
        }
    });
});



app.post('/submit',(req,res)=>
{
    const {id,name,mobile,salary} = req.body;

    const insert_query = 'insert into employeedata (empid,empname,mobile,salary) values($1,$2,$3,$4)'
    con.query(insert_query,[id,name,mobile,salary],(err,result)=>
    {
        if(err)
        {
            console.log(err);
        }

        else
        {
            res.redirect('/insert');
        }
    })
})


app.get('/edit/:empid/:empname/:mobile/:salary',(req,res)=>
{
    let eid = req.params.empid;
    let ename = req.params.empname;
    let emobile = req.params.mobile;
    let esalary = req.params.salary;

    res.render('update.ejs',{data1:eid, data2:ename, data3:emobile, data4:esalary})
})


app.post('/update',(req,res)=>
{
    const {id,name,mobile,salary} = req.body;

    const update_query = 'update employeedata set empname = $1, mobile = $2, salary = $3 where empid = $4'

    con.query(update_query,[name,mobile,salary,id],(err,result)=>
    {
        if(err)
        {
            console.log(err);
        }

        else
        {
            res.redirect('/insert');
        }
    })
})


app.get('/delete/:eid',(req,res)=>
{
    const id = req.params.eid;

    const delete_query = 'delete from employeedata where empid = $1'

    con.query(delete_query,[id],(err,result)=>
    {
        if(err)
        {
            console.log(err);
        }

        else
        {
            res.redirect('/insert');
        }
    })
})


app.get('/payroll/:id',(req,res)=>
{
    const eid = req.params.id;

    const select_salary = 'select salary from employeedata where empid = $1'

    const select_query = 'select * from employeesalary where empid = $1 order by workingday';


    con.query(select_salary,[eid],(err,result)=>
    {
        if(err)
        {
            console.log(err)
        }

        else
        {
            s1 = Number(result.rows[0].salary);
            s2 = s1/30;
            total_salary = Math.floor(s2);
           
        }
    })



    con.query(select_query,[eid], (err, result) => {
        if (err) {
            console.log(err);
            res.send('Database error');
        }
        else
        {
           
            res.render('payroll.ejs', {employees: result.rows || [], empid: eid, total_salary: total_salary});
        }
    });



})



app.post('/addPayroll/:id',(req,res)=>
{
    const eid = req.params.id;
    const { date, attendance, uppad,salaryperday } = req.body;

   
    const insert_query = 'insert into employeesalary(empid,workingday,status,uppad,salaryperday) values ($1,$2,$3,$4,$5)'

   
    con.query(insert_query,[eid,date,attendance,uppad,salaryperday],(err,result)=>
    {
        if(err)
        {
            console.log(err);
        }

        else
        {
            res.redirect(`/payroll/${eid}`);
        }
    })
})



app.get('/editpayroll/:empid/:workingday/:status/:uppad/:remainsalary/:salaryperday', (req, res) => {
    const { empid, workingday, status, uppad, remainsalary, salaryperday } = req.params;


    res.render('updatePayroll.ejs', {empid,workingday,status,uppad,remainsalary,salaryperday});
});



app.post('/updatepayroll', (req, res) => {
    const { empid, workingday, status, uppad, salaryperday } = req.body;
   
    const [day, month, year] = workingday.split('-');
    const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    const update_query = `UPDATE employeesalary SET status = $1, uppad = $2, salaryperday = $3 WHERE empid = $4 AND workingday = $5`;

    con.query(
        update_query,[status, uppad, salaryperday, empid, formattedDate],(err, result) => {
            if (err) {
                console.error('Update Error:', err);
                res.status(500).send("Error updating payroll");
            } else {
                res.redirect(`/payroll/${empid}`);
            }
        }
    );
});



app.get('/deletepayroll/:eid/:date', (req, res) => {
    const id = req.params.eid;
    const inputDate = req.params.date;   
    const [day, month, year] = inputDate.split('-');
    const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    const delete_query = 'DELETE FROM employeesalary WHERE empid = $1 AND workingday = $2';

    con.query(delete_query, [id, formattedDate], (err, result) => {
        if (err) {
            console.log('Delete error:', err);
            res.status(500).send("Error deleting payroll record");
        } else {
            res.redirect(`/payroll/${id}`);
        }
    });
});


app.listen(process.env.PORT, () => {
    console.log(`server is running`)
})
