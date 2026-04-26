import { Suspense, lazy, useState, useRef } from "react";
import PhoneFrame from "./components/PhoneFrame";
import ScreenLoader from "./components/ScreenLoader";
import TemplateSelectScreen from "./screens/TemplateSelectScreen";
import StepGuideScreen from "./screens/StepGuideScreen";
import ResultScreen from "./screens/ResultScreen";
import CommunityScreen from "./screens/CommunityScreen";
import BasicTutorialScreen from "./screens/BasicTutorialScreen";
import CameraPatternScreen from "./screens/CameraPatternScreen";
import ProfilesScreen from "./screens/ProfilesScreen";
import ProfileEditorScreen from "./screens/ProfileEditorScreen";
import useProfiles from "./hooks/useProfiles";

const HomeScreen = lazy(() => import("./screens/HomeScreen"));
const UploadScreen = lazy(() => import("./screens/UploadScreen"));
const AnalysisScreen = lazy(() => import("./screens/AnalysisScreen"));
const PatternLayoutScreen = lazy(() => import("./screens/PatternLayoutScreen"));

export default function App() {
  const [screen, setScreen] = useState("home");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("bag");
  const [longestSideCm, setLongestSideCm] = useState(null);
  const [measurements, setMeasurements] = useState(null);
  const [segmentation, setSegmentation] = useState(null);
  const [feasibleTemplates, setFeasibleTemplates] = useState(null);
  const [fabric, setFabric] = useState(null);
  const [usableAreaCm2, setUsableAreaCm2] = useState(0);

  const {
    profiles,
    activeProfileId,
    activeProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
  } = useProfiles();

  // Which profile is open in the editor (null = new profile)
  const [editingProfileId, setEditingProfileId] = useState(null);

  // Per-navigation profile override — reset on every screen change
  const [sessionProfileOverride, setSessionProfileOverride] = useState(null);

  // Where the user came from before patternLayout (for back button)
  const [patternLayoutFrom, setPatternLayoutFrom] = useState("templateSelect");

  const [previews, setPreviews] = useState(() => {
    try {
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith("preview_v1_")) continue;
        const withoutPrefix = key.slice("preview_v1_".length);
        const separatorIdx = withoutPrefix.indexOf("_");
        if (separatorIdx === -1) continue;
        const hash = withoutPrefix.slice(0, separatorIdx);
        if (!/^[0-9a-f]{8,16}$/.test(hash)) continue;
        const templateId = withoutPrefix.slice(separatorIdx + 1);
        const value = localStorage.getItem(key);
        if (value && templateId) result[templateId] = value;
      }
      return result;
    } catch {
      return {};
    }
  });

  const navigate = (to, data = {}) => {
    if (data.image !== undefined) setUploadedImage(data.image);
    if (data.imageFile !== undefined) setUploadedFile(data.imageFile);
    if (data.template !== undefined) setSelectedTemplate(data.template);
    if (data.longestSideCm !== undefined) setLongestSideCm(data.longestSideCm);
    if (data.usableAreaCm2 !== undefined) setUsableAreaCm2(data.usableAreaCm2);
    if (data.measurements !== undefined) setMeasurements(data.measurements);
    if (data.segmentation !== undefined) setSegmentation(data.segmentation);
    if (data.feasibleTemplates !== undefined)
      setFeasibleTemplates(data.feasibleTemplates);
    if (data.fabric !== undefined) setFabric(data.fabric);
    if (to === "profileEditor") {
      setEditingProfileId(data.profileId ?? null);
    }
    if (to === "patternLayout" && data.from !== undefined) {
      setPatternLayoutFrom(data.from);
    }
    setSessionProfileOverride(null);
    setScreen(to);
  };

  const commonProps = { navigate, uploadedImage, template: selectedTemplate };

  const screens = {
    home: <HomeScreen navigate={navigate} activeProfile={activeProfile} />,
    upload: <UploadScreen navigate={navigate} />,
    analysis: (
      <AnalysisScreen
        navigate={navigate}
        uploadedImage={uploadedImage}
        uploadedFile={uploadedFile}
        longestSideCm={longestSideCm}
        usableAreaCm2={usableAreaCm2}
      />
    ),
    templateSelect: (
      <TemplateSelectScreen
        navigate={navigate}
        feasibleTemplates={feasibleTemplates}
        fabric={fabric}
        measurements={measurements}
        activeProfile={activeProfile}
        sessionProfileOverride={sessionProfileOverride}
        setSessionProfileOverride={setSessionProfileOverride}
        profiles={profiles}
        updateProfile={updateProfile}
        previews={previews}
        setPreviews={setPreviews}
      />
    ),
    patternLayout: (
      <PatternLayoutScreen
        navigate={navigate}
        template={selectedTemplate}
        measurements={measurements}
        segmentation={segmentation}
        uploadedImage={uploadedImage}
        activeProfile={activeProfile}
        sessionProfileOverride={sessionProfileOverride}
        setSessionProfileOverride={setSessionProfileOverride}
        profiles={profiles}
        updateProfile={updateProfile}
        from={patternLayoutFrom}
      />
    ),
    stepGuide: (
      <StepGuideScreen navigate={navigate} template={selectedTemplate} />
    ),
    result: (
      <ResultScreen
        navigate={navigate}
        template={selectedTemplate}
        uploadedImage={uploadedImage}
        fabric={fabric}
      />
    ),
    learn: (
      <BasicTutorialScreen navigate={navigate} activeProfile={activeProfile} />
    ),
    arPattern: (
      <CameraPatternScreen
        navigate={navigate}
        template={selectedTemplate}
        longestSideCm={longestSideCm}
      />
    ),
    community: (
      <CommunityScreen navigate={navigate} activeProfile={activeProfile} />
    ),
    profiles: (
      <ProfilesScreen
        profiles={profiles}
        activeProfileId={activeProfileId}
        activeProfile={activeProfile}
        addProfile={addProfile}
        deleteProfile={deleteProfile}
        setActiveProfile={setActiveProfile}
        navigate={navigate}
      />
    ),
    profileEditor: (
      <ProfileEditorScreen
        profile={profiles.find((p) => p.id === editingProfileId) ?? null}
        addProfile={addProfile}
        updateProfile={updateProfile}
        navigate={navigate}
      />
    ),
  };

  return (
    <PhoneFrame>
      <Suspense fallback={<ScreenLoader />}>
        {screens[screen] ?? screens.home}
      </Suspense>
    </PhoneFrame>
  );
}
