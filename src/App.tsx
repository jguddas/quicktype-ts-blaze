import React from 'react'
import json5 from 'json5'
import Page from './Page'
import './App.css';
import '@tabler/core/dist/css/tabler.css';

const EXAMPLE_JSON = `
{
  greeting: 'Welcome to quicktype!',
  instructions: [
    'Type or paste JSON here',
    'Or choose a sample above',
    'quicktype will generate code in your',
    'chosen language to parse the sample data'
  ]
}
`.trim()

const parseInput = (str: string):string => {
  try {
    const json = json5.parse(str)
    return JSON.stringify(json, null, 2)
  } catch (e) {
    return 'Invalid input!'
  }
}

function App() {
  const [input, setInput] = React.useState(EXAMPLE_JSON)
  const [output, setOutput] = React.useState(parseInput(EXAMPLE_JSON))
  return (
    <Page
      input={input}
      output={output}
      onChangeInput={(str) => {
        setInput(str)
        setOutput(parseInput(str))
      }}
      onChangeOutput={() => {}}
    />
  );
}

export default App;
