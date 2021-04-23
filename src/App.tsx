import React from 'react'
import Page from './Page'
import './App.css';
import '@tabler/core/dist/css/tabler.css';

function App() {
  const [input, setInput] = React.useState('')
  const [output, setOutput] = React.useState('')
  return (
    <Page
      input={input}
      output={output}
      onChangeInput={(str) => {
        setInput(str)
        setOutput(str)
      }}
      onChangeOutput={() => {}}
    />
  );
}

export default App;
