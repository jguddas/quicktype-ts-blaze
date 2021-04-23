import React from 'react'
import json5 from 'json5'
import Page from './Page'
import './App.css';
import '@tabler/core/dist/css/tabler.css';
import TsBlazeTargetLanguage from './language'
import { quicktype, InputData, jsonInputForTargetLanguage } from "quicktype-core";

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

const parseJson = async (str: string):Promise<any> => {
  try {
    return json5.parse(str)
  } catch (e) {
    throw new Error('Invalid input!')
  }
}

const parseInput = async (str: string, name: string):Promise<string> => {
  const targetLanguage = new TsBlazeTargetLanguage()
  const jsonInput = jsonInputForTargetLanguage(targetLanguage);

  await jsonInput.addSource({
    name,
    samples: [JSON.stringify(await parseJson(str))],
  });

  const inputData = new InputData();
  inputData.addInput(jsonInput);

  const result = await quicktype({
    inferUuids: true,
    inputData,
    lang: targetLanguage,
  });

  return result.lines.join('\n')
}

function App() {
  const [input, setInput] = React.useState(EXAMPLE_JSON)
  const [output, setOutput] = React.useState('')
  React.useEffect(() => {
    setOutput('Loading…')
    parseInput(input, 'example').then(setOutput, setOutput)
  },[ input, setOutput ])
  return (
    <Page
      input={input}
      output={output}
      onChangeInput={setInput}
      onChangeOutput={() => {}}
    />
  );
}

export default App;
