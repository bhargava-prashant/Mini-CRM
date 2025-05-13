// SignIn.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // fixed import

export default function SignIn() {
  const navigate = useNavigate();

  useEffect(() => {
    const initializeGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: "1055394746338-0h0l3j890348rj3a7ru88oh0iln8r71h.apps.googleusercontent.com", // Replace this
          callback: handleCredentialResponse,
        });
  
        window.google.accounts.id.renderButton(
          document.getElementById("googleSignInDiv"),
          {
            theme: "outline",
            size: "large",
          }
        );
      } else {
        console.error("Google API not loaded yet.");
      }
    };
  
    initializeGoogle();
  }, []);
  

  const handleCredentialResponse = (response) => {
    try {
      const userObject = jwtDecode(response.credential);
      console.log("Google User Info:", userObject);

 
      localStorage.setItem("googleUser", JSON.stringify(userObject));

   
      navigate("/campaign");

    } catch (err) {
      console.error("Google Sign-In failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="bg-gray-900/80 p-10 rounded-xl shadow-xl w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-6">Sign In with Google</h1>
        <div id="googleSignInDiv" className="flex justify-center" />
      </div>
    </div>
  );
}
