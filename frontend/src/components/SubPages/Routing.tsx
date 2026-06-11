import "../../styles/global.css";
import "../../styles/Dashboard.css";
import "../../styles/Routing.css";

import React, { useEffect, useState } from "react";

import Card from "../Card";
import Table from "../Table";
import DropdownButton from "../DropdownButton";

import {
    RoutingDocument,
    Department
} from "../../types";

import {
    getRoutingDocuments,
    getDepartments
} from "../../services/api";

import { useNavigate } from "react-router-dom";

const Routing = () => {

    const navigate = useNavigate();

    const translateRouteStatus = (status: string) => {
    switch (status) {
        case "completed":
            return "Доставлен";

        case "processing":
            return "В обработке";

        case "pending":
            return "Ожидает";

        case "rejected":
            return "Отклонён";

        default:
            return status;
    }
};

    const [documents,setDocuments]=useState<RoutingDocument[]>([]);
    const [departments,setDepartments]=useState<Department[]>([]);

    const [loading,setLoading]=useState(true);
    const [error,setError]=useState("");

    const [selectedDepartment,setSelectedDepartment]=useState("Все отделы");
    const [departmentId,setDepartmentId]=useState<number|undefined>();

    const [active,setActive]=useState(false);

    const fetchData=async()=>{

        try{

            setLoading(true);

            const [docs,deps]=await Promise.all([
                getRoutingDocuments(departmentId),
                getDepartments()
            ]);

            setDocuments(docs);
            setDepartments(deps);

            setError("");

        }
        catch(err){

            console.log(err);

            setError("Ошибка загрузки маршрутизации");

        }
        finally{

            setLoading(false);

        }

    }

    useEffect(()=>{

        fetchData();

    },[departmentId]);

    const getStatusClass=(status:string)=>{

        switch(status){

            case "completed":
                return "routeSuccess";

            case "processing":
                return "routeProcess";

            case "pending":
                return "routePending";

            case "rejected":
                return "routeRejected";

            default:
                return "routeDefault";

        }

    }

    return(

        <div>

            <Card className="routingFilter">

                <DropdownButton

                    options={[
                        "Все отделы",
                        ...departments.map(d=>d.name)
                    ]}

                    selectedLabel={selectedDepartment}

                    defaultLabel="Все отделы"

                    onSelect={(name)=>{

                        setSelectedDepartment(name);

                        if(name==="Все отделы"){

                            setDepartmentId(undefined);

                        }else{

                            const dep=departments.find(
                                d=>d.name===name
                            );

                            setDepartmentId(dep?.id);

                        }

                    }}

                    isOpen={active}

                    onToggle={()=>setActive(!active)}

                />

            </Card>

            <Card>

                <Table
                    title={
                        <h4>
                            Маршрутизация ({documents.length})
                        </h4>
                    }
                >

                    <thead>

                        <tr>

                            <th>Рег. номер</th>

                            <th>Название</th>

                            <th>Текущий отдел</th>

                            <th>Рекомендуемый</th>

                            <th>Статус</th>

                        </tr>

                    </thead>

                    <tbody>

                        {

                            loading ?

                            <tr>

                                <td colSpan={5}>

                                    Загрузка...

                                </td>

                            </tr>

                            :

                            error ?

                            <tr>

                                <td colSpan={5}>

                                    {error}

                                </td>

                            </tr>

                            :

                            documents.length===0 ?

                            <tr>

                                <td colSpan={5}>

                                    Нет документов

                                </td>

                            </tr>

                            :

                            documents.map(doc=>(

                                <tr
                                    key={doc.id}
                                    onClick={()=>
                                        navigate(
                                            `/dashboard/documents/${doc.id}`
                                        )
                                    }
                                    className="routingRow"
                                >

                                    <td>

                                        {doc.registrationNumber}

                                    </td>

                                    <td>

                                        {doc.title}

                                    </td>

                                    <td>

                                        {doc.currentDepartment}

                                    </td>

                                    <td>

                                        {doc.suggestedDepartment}

                                    </td>

                                    <td>

                                        <span
                                        className={
                                            `routeBadge ${getStatusClass(doc.routeStatus)}`
                                        }
                                        >

                                            {translateRouteStatus(doc.routeStatus)}

                                        </span>

                                    </td>

                                </tr>

                            ))

                        }

                    </tbody>

                </Table>

            </Card>

        </div>

    )

}

export default Routing;