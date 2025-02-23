import { BrowserRouter, Route, Routes } from "react-router-dom"
import { CodePage } from "./components/CodePage/CodePage"
import Home from "./components/Home/Home"



function App() {
 

  return (
    <>  
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home/>}></Route>
          <Route path="/code" element={<CodePage/>}></Route>
        </Routes>  
      </BrowserRouter>
      
    </>
  )
}

export default App
