import useProfiles from "../hooks/useProfiles";

export default function ProfilesHookTest() {
  const {
    profiles,
    activeProfileId,
    activeProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    setActiveProfile,
  } = useProfiles();

  return (
    <div style={{ padding: 16, fontFamily: "monospace", fontSize: 12 }}>
      <button
        onClick={() => {
          const p = addProfile("Test User");
          setActiveProfile(p.id);
          updateProfile(p.id, { measurements: { chest: 980 } });
        }}
      >
        Add profile
      </button>
      <div style={{ marginTop: 8 }}>
        {profiles.map((p) => (
          <button
            key={p.id}
            style={{ marginRight: 8, color: "red" }}
            onClick={() => deleteProfile(p.id)}
          >
            Delete {p.name} ({p.id})
          </button>
        ))}
      </div>
      <pre>
        {JSON.stringify({ profiles, activeProfileId, activeProfile }, null, 2)}
      </pre>
    </div>
  );
}
