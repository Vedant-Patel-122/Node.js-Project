const express = require('express');
require('dotenv').config({ path: ".env" });
const { Pool } = require('pg');
const app = express();
const path = require('path');

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


app.use(express.static(path.join(__dirname, 'View'))); // this is used to serve static files like css, js, images etc.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'View'));
app.use(express.json()); // this is accept data in json format
app.use(express.urlencoded({ extended: false })); // it is used to decode the data send through html page

let total_salary = null;


function userinsert(req, res, next) {
    const { id, mobile } = req.body;

    const select_query1 = 'select empid from employeedata where empid = $1'
    const select_query2 = 'select mobile from employeedata where mobile = $1'

    con.query(select_query1, [id], (err, result) => {
        if (err) {
            res.send(err);
        } else {
            if (result.rows.length > 0) {
                con.query('SELECT * FROM employeedata ORDER BY empid', (err2, result2) => {
                    if (err2) return res.send(err2);
                    res.render('insert.ejs', {
                        alert: 'Employee Id already exists',
                        employees: result2.rows || []
                    });
                });
            }
            else {
                    con.query(select_query2, [mobile], (err, result) => {
                        if (err) {
                            res.send(err);
                        } else {
                            if (result.rows.length > 0) {
                                con.query('SELECT * FROM employeedata ORDER BY empid', (err2, result2) => {
                                    if (err2) return res.send(err2);
                                    res.render('insert.ejs', {alert: 'Employee Mobile number already exists',employees: result2.rows || []});
                                });
                            } else {
                                next();
                            }
                        }
                    });
            }
        }
    });
}


// function userupdate(req, res, next) {
//     const { mobile } = req.body;

//     const select_query1 = 'select mobile from employeedata where mobile = $1'

//     con.query(select_query1, [mobile], (err, result) => {
//         if (err) {
//             res.send(err);
//         }

//         else {

//             if (result.rows.length > 0) {
//                 res.render('update.ejs', { alert: 'Employee Mobile number already exists', data1: req.body.id, data2: req.body.name, data3: req.body.mobile, data4: req.body.salary });
//             }

//             else {
//                 next();
//             }
//         }
//     })
// }




app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'View', 'homepage.html'));
})


app.get('/insert', (req, res) => {

    const select_query = 'select * from employeedata order by empid';

    con.query(select_query, null, (err, result) => {
        if (err) {
            console.log(err);
            res.send('Database error');
        } else {

            res.render('insert.ejs', { employees: result.rows || [] });

        }
    });
});



app.post('/submit', userinsert, (req, res) => {
    const { id, name, mobile, salary } = req.body;

    const insert_query = 'insert into employeedata (empid,empname,mobile,salary) values($1,$2,$3,$4)'
    con.query(insert_query, [id, name, mobile, salary], (err, result) => {
        if (err) {
            console.log(err);
        }

        else {
            res.redirect('/insert');
        }
    })
})


app.get('/edit/:empid/:empname/:mobile/:salary', (req, res) => {
    let eid = req.params.empid;
    let ename = req.params.empname;
    let emobile = req.params.mobile;
    let esalary = req.params.salary;

    res.render('update.ejs', { data1: eid, data2: ename, data3: emobile, data4: esalary })
})


app.post('/update', /*userupdate*/ (req, res) => {
    const { id, name, mobile, salary } = req.body;

    const update_query = 'update employeedata set empname = $1, mobile = $2, salary = $3 where empid = $4'

    con.query(update_query, [name, mobile, salary, id], (err, result) => {
        if (err) {
            console.log(err);
        }

        else {
            res.redirect('/insert');
        }
    })
})


app.get('/delete/:eid', (req, res) => {
    const id = req.params.eid;

    const delete_query = 'delete from employeedata where empid = $1'

    con.query(delete_query, [id], (err, result) => {
        if (err) {
            console.log(err);
        }

        else {
            res.redirect('/insert');
        }
    })
})


app.get('/payroll/:id', (req, res) => {
    const eid = req.params.id;

    const select_salary = 'select salary from employeedata where empid = $1'

    const select_query = 'select * from employeesalary where empid = $1 order by workingday';


    con.query(select_salary, [eid], (err, result) => {
        if (err) {
            console.log(err)
        }

        else {
            s1 = Number(result.rows[0].salary);
            // s2 = s1 / 30;
            // total_salary = s2
            // total_salary = Math.round((s2) * 100) / 100;

        }
    });



    con.query(select_query, [eid], (err, result) => {
        if (err) {
            console.log(err);
            res.send('Database error');
        }
        else {

            res.render('payroll.ejs', { employees: result.rows || [], empid: eid, total_salary: s1 });

        }
    });



})



app.post('/addPayroll/:id', (req, res) => {
    const eid = req.params.id;
    const { date, attendance, uppad, salaryperday } = req.body;
    let f_salaryperday = null;
    if (attendance === 'Half Day') {
        // f_salaryperday = salaryperday/2;
        f_salaryperday = Math.round((salaryperday / 2) * 100) / 100;


    }

    else if (attendance === 'Absent') {

        f_salaryperday = 0;


    }

    else {
        f_salaryperday = salaryperday;
    }


    const insert_query = 'insert into employeesalary(empid,workingday,status,uppad,salaryperday) values ($1,$2,$3,$4,$5)'


    con.query(insert_query, [eid, date, attendance, uppad, f_salaryperday], (err, result) => {
        if (err) {
            console.log(err);
        }

        else {
            res.redirect(`/payroll/${eid}`);
        }
    })
})



app.get('/editpayroll/:empid/:workingday/:status/:uppad/:remainsalary/:salaryperday', (req, res) => {
    const { empid, workingday, status, uppad, remainsalary, salaryperday } = req.params;


    res.render('updatepayroll.ejs', { empid, workingday, status, uppad, remainsalary, salaryperday });

});



app.post('/updatepayroll', (req, res) => {
    const { empid, workingday, status, uppad, salaryperday } = req.body;

    const [day, month, year] = workingday.split('-');
    const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    const update_query = `UPDATE employeesalary SET status = $1, uppad = $2, salaryperday = $3 WHERE empid = $4 AND workingday = $5`;

    con.query(
        update_query, [status, uppad, salaryperday, empid, formattedDate], (err, result) => {
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


app.get('/payrollHistory/:id', (req, res) => {
    const eid = req.params.id;

    res.render('payrollhistory.ejs', { empid: eid, employees: [] });
})



app.post('/findpayrolldata', (req, res) => {
    const eid = req.body.id;
    const monthyear = req.body.monthyear;
    const month1 = monthyear.substring(5, 7);
    const year1 = monthyear.substring(0, 4);
    const month2 = monthyear.substring(5, 7);
    const year2 = monthyear.substring(0, 4);


    // const select_query = ` SELECT es.*,ed.salary AS e_salary,agg.sum_uppad,ed.salary - agg.sum_uppad AS salary_diff,SUM(es.salaryperday) AS total_salary
    // FROM employeesalary es
    // JOIN employeedata ed ON ed.empid = es.empid
    // JOIN (SELECT empid, SUM(uppad) AS sum_uppad FROM employeesalary
    // WHERE EXTRACT(MONTH FROM workingday) = $1
    // AND EXTRACT(YEAR FROM workingday) = $2
    // GROUP BY empid) agg ON agg.empid = es.empid
    // WHERE es.empid = $3
    // AND EXTRACT(MONTH FROM es.workingday) = $4
    // AND EXTRACT(YEAR FROM es.workingday) = $5
    // ORDER BY workingday;`;

    const select_query = `
    SELECT 
  es.*, 
  ed.salary AS e_salary,
  agg.sum_uppad,
  SUM(es.salaryperday) OVER (PARTITION BY es.empid, EXTRACT(MONTH FROM es.workingday), EXTRACT(YEAR FROM es.workingday)) AS total_salary,
  SUM(es.remainsalary) OVER (PARTITION BY es.empid, EXTRACT(MONTH FROM es.workingday), EXTRACT(YEAR FROM es.workingday)) AS total_remain_salary
FROM employeesalary es
JOIN employeedata ed 
  ON ed.empid = es.empid
JOIN (
  SELECT empid, SUM(uppad) AS sum_uppad 
  FROM employeesalary
  WHERE EXTRACT(MONTH FROM workingday) = $1
    AND EXTRACT(YEAR FROM workingday) = $2
  GROUP BY empid
) agg 
  ON agg.empid = es.empid
WHERE es.empid = $3
  AND EXTRACT(MONTH FROM es.workingday) = $4
  AND EXTRACT(YEAR FROM es.workingday) = $5
ORDER BY es.workingday;`



    con.query(select_query, [month1, year1, eid, month2, year2], (err, result) => {
        if (err) {
            console.log('Fetch error:', err);
            res.status(500).send("Error fetching payroll history");
        } else {

            res.render('payrollhistory.ejs', { employees: result.rows || [], empid: eid });

        }
    });
});


app.listen(process.env.PORT, () => {
    console.log(`server is running`)
})
