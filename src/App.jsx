import { useState } from 'react'
import PhoneFrame from './components/PhoneFrame'
import HomeScreen from './screens/HomeScreen'
import UploadScreen from './screens/UploadScreen'
import AnalysisScreen from './screens/AnalysisScreen'
import TemplateSelectScreen from './screens/TemplateSelectScreen'
import StepGuideScreen from './screens/StepGuideScreen'
import ResultScreen from './screens/ResultScreen'
import CommunityScreen from './screens/CommunityScreen'
import PatternLayoutScreen from './screens/PatternLayoutScreen'
import BasicTutorialScreen from './screens/BasicTutorialScreen'
import CameraPatternScreen from './screens/CameraPatternScreen'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState('bag')

  const navigate = (to, data = {}) => {
    if (data.image !== undefined) setUploadedImage(data.image)
    if (data.template !== undefined) setSelectedTemplate(data.template)
    setScreen(to)
  }

  const commonProps = { navigate, uploadedImage, template: selectedTemplate }

  const screens = {
    home:           <HomeScreen           navigate={navigate} />,
    upload:         <UploadScreen         navigate={navigate} />,
    analysis:       <AnalysisScreen       navigate={navigate} uploadedImage={uploadedImage} />,
    templateSelect: <TemplateSelectScreen navigate={navigate} />,
    patternLayout:  <PatternLayoutScreen  navigate={navigate} template={selectedTemplate} />,
    stepGuide:      <StepGuideScreen      navigate={navigate} template={selectedTemplate} />,
    result:         <ResultScreen         navigate={navigate} template={selectedTemplate} uploadedImage={uploadedImage} />,
    learn:          <BasicTutorialScreen  navigate={navigate} />,
    arPattern:      <CameraPatternScreen  navigate={navigate} template={selectedTemplate} />,
    community:      <CommunityScreen      navigate={navigate} />,
  }

  return (
    <PhoneFrame>
      {screens[screen] ?? screens.home}
    </PhoneFrame>
  )
}
