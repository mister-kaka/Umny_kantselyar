import "../../styles/global.css";
import "../../styles/Dashboard.css";
import "../../styles/Departments.css";

import React, { useEffect, useState } from "react";
import Card from "../Card";

import {
  Department,
  DashboardData,
  GroupedDepartment
} from "../../types";

import {
  getDepartments,
  getDashboard
} from "../../services/api";

const Departments = () => {

  const [departments, setDepartments] = useState<Department[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{

    const fetchData=async()=>{

      try{

        setLoading(true);

        const [dep,dash]=await Promise.all([
          getDepartments(),
          getDashboard()
        ]);

        setDepartments(dep);
        setDashboard(dash);

      }
      catch(err){

        console.log(err);

        setError("Ошибка загрузки подразделений");

      }
      finally{

        setLoading(false);

      }

    }

    fetchData();

  },[]);

  const grouped:GroupedDepartment[]=
  dashboard?.departmentRouteStatuses.reduce((acc,item)=>{

    const exist=acc.find(
      d=>d.departmentId===item.departmentId
    );

    if(exist){

      exist.statuses.push({
        routeStatus:item.routeStatus,
        count:item.count
      });

    }else{

      acc.push({

        departmentId:item.departmentId,

        departmentName:item.departmentName,

        statuses:[
          {
            routeStatus:item.routeStatus,
            count:item.count
          }
        ]

      });

    }

    return acc;

  },[] as GroupedDepartment[]) || [];

  const getColor=(status:string)=>{

    switch(status){

      case "completed":
      return "#81D8D0";

      case "processing":
      return "#F3C36B";

      case "rejected":
      return "#F27979";

      case "pending":
      return "#87A8FF";

      default:
      return "#DADADA";

    }

  }

  if(loading){

    return <Card>Загрузка...</Card>

  }

  if(error){

    return <Card>{error}</Card>

  }

  return(

    <div>

      <Card>

        <div className="departmentHeader">

          <h2>Подразделения</h2>

          <span>

            Всего: {departments.length}

          </span>

        </div>

      </Card>

      <div className="departmentGrid">

        {grouped.map(dep=>(

          <Card
          key={dep.departmentId}
          className="departmentCard"
          >

            <div
            className="departmentSquare"
            />

            <h3>

              {dep.departmentName}

            </h3>

            <div className="departmentTotal">

              {dep.statuses.reduce(
                (a,b)=>a+b.count,
                0
              )}

              документов

            </div>

            <div className="departmentStatuses">

              {

                dep.statuses.map((status,index)=>(

                  <div
                  key={index}
                  className="departmentStatus"
                  >

                    <span
                    className="departmentDot"
                    style={{
                      background:getColor(status.routeStatus)
                    }}
                    />

                    <span>

                      {status.routeStatus}

                    </span>

                    <strong>

                      {status.count}

                    </strong>

                  </div>

                ))

              }

            </div>

          </Card>

        ))}

      </div>

    </div>

  )

}

export default Departments;