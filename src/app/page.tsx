import SandboxScreen from "./screens/sandbox/sandbox";
import SandboxWithContext from "./screens/sandbox/sandboxwithcontext";

export default function Home() {
  return (
    <div className="home-screen-wrapper">
      {/* <SandboxScreen /> */}
      <SandboxWithContext />
    </div>
  );
}
