import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'

function App(): JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <div
      style={{
        backgroundColor: '#1a365d', // dark blue background
        minHeight: '100vh', // full viewport height
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <h1
        style={{
          color: 'white',
          fontSize: '4rem',
          fontWeight: 'bold'
        }}
      >
        Hello World
      </h1>
    </div>
  )
}

export default App
