import './App.css';
import './components/FileExplorer.css';
import FileExplorer from './components/FileExplorer';
import { DarkModeProvider } from './context/DarkModeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <DarkModeProvider>
      <div className="App">
        <FileExplorer />
        <ToastContainer 
          position="top-right" 
          autoClose={3000} 
          hideProgressBar={false} 
          newestOnTop={false} 
          closeOnClick 
          rtl={false} 
          pauseOnFocusLoss 
          draggable 
          pauseOnHover 
          theme="colored" 
        />
      </div>
    </DarkModeProvider>
  );
}

export default App;