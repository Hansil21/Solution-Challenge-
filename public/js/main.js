import { GoogleGenAI } from "https://esm.sh/@google/genai";

document.addEventListener('DOMContentLoaded', () => {
  // Simple check for success toast
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('success')) {
    const toast = document.querySelector('.toast');
    if (toast) {
      toast.style.display = 'block';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 4000);
    }
  }

  // File upload interaction
  const uploadZone = document.querySelector('.upload-zone');
  const fileInput = document.querySelector('#video-input');

  if (uploadZone && fileInput) {
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = '#3B82F6';
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        // Optionally auto-submit
        fileInput.closest('form').submit();
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        fileInput.closest('form').submit();
      }
    });
  }

  // Scanning animation handling
  const scanForm = document.querySelector('#scan-form');
  if (scanForm) {
    scanForm.addEventListener('submit', () => {
      const btn = scanForm.querySelector('button');
      btn.innerHTML = `<span class="spinner"></span> ANALYZING DNA...`;
      btn.disabled = true;
      btn.style.opacity = '0.7';
    });
  }

  // Legal Notice Generation
  const noticeBtn = document.querySelector('#generate-notice-btn');
  const modal = document.querySelector('#notice-modal');
  const noticeText = document.querySelector('#notice-text');
  const closeModalBtns = document.querySelectorAll('.close-modal');

  if (noticeBtn && modal) {
    noticeBtn.addEventListener('click', async () => {
      modal.style.display = 'flex';
      noticeText.innerHTML = `<span class="spinner"></span> Engineering AI enforcement draft...`;
      
      const scanId = window.location.pathname.split('/').pop();
      try {
        // Fetch data first
        const dataRes = await fetch(`/api/scan-data/${scanId}`);
        const scanData = await dataRes.json();
        
        if (!scanData || scanData.error) throw new Error("Data missing");

        // Call Gemini directly from frontend
        const ai = new GoogleGenAI({ apiKey: window.GEMINI_API_KEY });
        const prompt = `You are a legal assistant for a professional sports club's intellectual property department. 
        Generate a formal and firm Cease and Desist email based on this digital content theft detection:
        - Official Content: ${scanData.fileName}
        - Unauthorized Source/URL: ${scanData.suspectUrl}
        - Similarity Match: ${scanData.similarityScore}%
        - Security Status: ${scanData.status}
        - Detected At: ${scanData.scannedAt}
        
        The email should demand immediate removal within 24 hours and cite standard international intellectual property protection policies. 
        Keep the tone professional, authoritative, and non-negotiable. 
        Include placeholders like [RECIPIENT NAME] and [YOUR NAME/CLUB NAME].
        Return only the letter body without any meta-commentary.`;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });

        if (response.text) {
          noticeText.innerHTML = response.text;
        } else {
          noticeText.innerHTML = "Error generating notice. Please try again.";
        }
      } catch (err) {
        console.error(err);
        noticeText.innerHTML = "Security system bottleneck. AI disconnected.";
      }
    });

    closeModalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    });

    window.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });
  }
});
