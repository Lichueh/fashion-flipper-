import { useState } from "react";
import PhoneFrame from "./components/PhoneFrame";
import HomeScreen from "./screens/HomeScreen";
import UploadScreen from "./screens/UploadScreen";
import AnalysisScreen from "./screens/AnalysisScreen";
import TemplateSelectScreen from "./screens/TemplateSelectScreen";
import StepGuideScreen from "./screens/StepGuideScreen";
import ResultScreen from "./screens/ResultScreen";
import CommunityScreen from "./screens/CommunityScreen";
import PatternLayoutScreen from "./screens/PatternLayoutScreen";
import BasicTutorialScreen from "./screens/BasicTutorialScreen";
import CameraPatternScreen from "./screens/CameraPatternScreen";
import ArMeasureScreen from "./screens/ArMeasureScreen";
import ArTutorialScreen from "./screens/ArTutorialScreen";
import RulerCalibrationScreen from "./screens/RulerCalibrationScreen";
import ProfilesScreen from "./screens/ProfilesScreen";
import ProfileEditorScreen from "./screens/ProfileEditorScreen";
import SkillLevelScreen from "./screens/SkillLevelScreen";
import AuthScreen from "./screens/AuthScreen";
import ClosetScreen from "./screens/ClosetScreen";
import CoachmarkTour from "./components/CoachmarkTour";
import useProfiles from "./hooks/useProfiles";
import { useAuth } from "./context/AuthContext";

const WALKTHROUGH_KEY = "ff_walkthrough_seen_v1";

// 3-stop coachmark tour for first-time users. Targets are real DOM elements
// marked with data-tour="…" inside HomeScreen + BottomNav. Mounted once at
// the App level (HomeScreen would be rendered twice by PhoneFrame's
// desktop/mobile dual branches; the tour's portal-to-body would surface both
// copies and we'd see two overlays).
const TOUR_STEPS = [
  { target: '[data-tour="tour-start"]', radius: 999 },
  { target: '[data-tour="tour-learn"]', radius: 14, placement: "above" },
  { target: '[data-tour="tour-profile"]', radius: 14, placement: "above" },
];

export default function App() {
  const { user, authLoading, signOut } = useAuth();
  const [screen, setScreen] = useState("home");
  const [walkthroughSeen, setWalkthroughSeen] = useState(() => {
    try {
      return localStorage.getItem(WALKTHROUGH_KEY) === "1";
    } catch {
      return false;
    }
  });
  function markWalkthroughSeen() {
    try {
      localStorage.setItem(WALKTHROUGH_KEY, "1");
    } catch {}
    setWalkthroughSeen(true);
  }
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("bag");
  const [lengthGarment, setLengthGarment] = useState(null);
  const [calibPxPerCm, setCalibPxPerCm] = useState(null);
  const [scaleCmPerImagePx, setScaleCmPerImagePx] = useState(null);
  const [imageWidth, setImageWidth] = useState(null);
  const [hasLayers, setHasLayers] = useState(true);
  const [measurements, setMeasurements] = useState(null);
  const [segmentation, setSegmentation] = useState(null);
  const [feasibleTemplates, setFeasibleTemplates] = useState(null);
  const [fabric, setFabric] = useState(null);

  const {
    profiles,
    activeProfileId,
    activeProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
    loading: profilesLoading,
    timedOut: profilesTimedOut,
    initialized: profilesInitialized,
  } = useProfiles(user?.id);

  // Which profile is open in the editor (null = new profile)
  const [editingProfileId, setEditingProfileId] = useState(null);

  // Per-navigation profile override — reset on every screen change
  const [sessionProfileOverride, setSessionProfileOverride] = useState(null);

  // Where the user came from before patternLayout (for back button)
  const [patternLayoutFrom, setPatternLayoutFrom] = useState("templateSelect");
  // Same for arTutorial — defaults to templateSelect, set to "learn" when
  // launched from BasicTutorialScreen so the back button returns there.
  const [arTutorialFrom, setArTutorialFrom] = useState("templateSelect");

  const navigate = (to, data = {}) => {
    if (data.image !== undefined) setUploadedImage(data.image);
    if (data.imageFile !== undefined) setUploadedFile(data.imageFile);
    if (data.template !== undefined) setSelectedTemplate(data.template);
    if (data.lengthGarment !== undefined) setLengthGarment(data.lengthGarment);
    if (data.calibPxPerCm !== undefined) setCalibPxPerCm(data.calibPxPerCm);
    if (data.scaleCmPerImagePx !== undefined)
      setScaleCmPerImagePx(data.scaleCmPerImagePx);
    if (data.imageWidth !== undefined) setImageWidth(data.imageWidth);
    if (data.hasLayers !== undefined) setHasLayers(data.hasLayers);
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
    if (to === "arTutorial") {
      setArTutorialFrom(data.from ?? "templateSelect");
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
        lengthGarment={lengthGarment}
        hasLayers={hasLayers}
        scaleCmPerImagePx={scaleCmPerImagePx}
        imageWidth={imageWidth}
      />
    ),
    templateSelect: (
      <TemplateSelectScreen
        navigate={navigate}
        feasibleTemplates={feasibleTemplates}
        fabric={fabric}
        measurements={measurements}
        uploadedFile={uploadedFile}
        activeProfile={activeProfile}
        sessionProfileOverride={sessionProfileOverride}
        setSessionProfileOverride={setSessionProfileOverride}
        profiles={profiles}
        updateProfile={updateProfile}
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
        uploadedFile={uploadedFile}
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
        lengthGarment={lengthGarment}
        calibPxPerCm={calibPxPerCm}
      />
    ),
    arMeasure: <ArMeasureScreen navigate={navigate} />,
    rulerCalibrate: (
      <RulerCalibrationScreen
        navigate={navigate}
        uploadedImage={uploadedImage}
        uploadedFile={uploadedFile}
        hasLayers={hasLayers}
      />
    ),
    arTutorial: (
      <ArTutorialScreen
        navigate={navigate}
        template={selectedTemplate}
        calibPxPerCm={calibPxPerCm}
        from={arTutorialFrom}
      />
    ),
    community: (
      <CommunityScreen navigate={navigate} activeProfile={activeProfile} />
    ),
    closet: <ClosetScreen navigate={navigate} activeProfile={activeProfile} />,
    profiles: (
      <ProfilesScreen
        profiles={profiles}
        activeProfileId={activeProfileId}
        activeProfile={activeProfile}
        addProfile={addProfile}
        deleteProfile={deleteProfile}
        setActiveProfile={setActiveProfile}
        navigate={navigate}
        signOut={signOut}
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
    skillLevel: (
      <SkillLevelScreen
        activeProfile={activeProfile}
        addProfile={addProfile}
        updateProfile={updateProfile}
        setActiveProfile={setActiveProfile}
        navigate={navigate}
      />
    ),
  };

  // First-launch skillLevel gate. If the active profile has no skillLevel yet
  // (or there is no profile at all), force the picker before anything else.
  // After skillLevel is set, the home screen renders the 3-stop coachmark tour
  // over its own UI on first visit (gated by `walkthroughSeen`).
  // Show a neutral spinner while Supabase auth or profile data is resolving,
  // to avoid flashing SkillLevelScreen before the data arrives.
  if (authLoading || (user && !profilesInitialized)) {
    return (
      <PhoneFrame>
        <div className="h-full flex items-center justify-center bg-primary-800">
          <p className="text-primary-300 text-sm">Loading…</p>
        </div>
      </PhoneFrame>
    );
  }

  if (!user) {
    return (
      <PhoneFrame>
        <AuthScreen />
      </PhoneFrame>
    );
  }

  // Skip the skill-level gate when profiles timed out — without profiles the
  // gate would trap the user on SkillLevelScreen with no way to sign out.
  const needsSkillLevel =
    !profilesTimedOut &&
    profilesInitialized &&
    (!activeProfile || !activeProfile.skillLevel);
  const effectiveScreen =
    needsSkillLevel && screen !== "skillLevel" ? "skillLevel" : screen;

  // The coachmark tour runs on the home screen for first-time users. Mounted
  // here at the top level (not inside HomeScreen) so PhoneFrame's dual-branch
  // rendering doesn't produce two overlays.
  const showTour = effectiveScreen === "home" && !walkthroughSeen;

  return (
    <>
      <PhoneFrame>{screens[effectiveScreen] ?? screens.home}</PhoneFrame>
      {showTour && (
        <CoachmarkTour steps={TOUR_STEPS} onDone={markWalkthroughSeen} />
      )}
    </>
  );
}
