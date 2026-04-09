import Sidebar from "../components/Sidebar" 
import Card from "../components/Card"
import Header from "../components/Header"
import "../styles/global.css"
const DashboardPage = () => {
  return (
    <div className="body">
      <Sidebar/>
      <Header/>
    </div>
  )

}
export default DashboardPage
