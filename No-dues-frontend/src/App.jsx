import { useState } from 'react'
import Login from './components/login';


function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Login />

      <h1>hii</h1>
    </>
  )
}

export default App
