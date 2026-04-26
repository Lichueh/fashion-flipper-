// components/ScreenLoader.jsx
export default function ScreenLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-primary-800 gap-4">
      <div className="flex flex-col items-center justify-center h-full bg-primary-800">
        <img
          src="/logo.svg"
          alt="Fashion Flipper"
          className="w-8 h-8 animate-pulse"
        />
      </div>
    </div>
  );
}
