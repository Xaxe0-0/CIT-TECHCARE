'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ImageSquare, Trash, MagnifyingGlassPlus } from '@phosphor-icons/react';

function encodePhoto(source: CanvasImageSource, width: number, height: number) {
  if (!width || !height) throw new Error('The camera is not ready yet. Please try again.');
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1920 / Math.max(width, height));
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot prepare the photo. Try another browser.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL('image/jpeg', 0.85);
  if (!data.startsWith('data:image/jpeg;') || data.length > 4000000)
    throw new Error('This photo is too large. Choose a smaller image.');
  return data;
}

// Must match the four photos savePost accepts (photo0..photo3).
const MAX_PHOTOS = 4;

export function QuestionPhoto({ onBusyChange }: { onBusyChange: (busy: boolean) => void }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const full = photos.length >= MAX_PHOTOS;
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [camera, setCamera] = useState<'off' | 'opening' | 'live'>('off');
  const [ready, setReady] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const upload = useRef<HTMLInputElement>(null);
  const nativeCamera = useRef<HTMLInputElement>(null);
  const cameraButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    onBusyChange(processing || camera !== 'off');
    return () => onBusyChange(false);
  }, [processing, camera, onBusyChange]);
  useEffect(
    () => () => {
      generation.current++;
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  function stopCamera() {
    generation.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setCamera('off');
    setReady(false);
  }
  async function openCamera() {
    stopCamera();
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        'Live camera needs HTTPS or localhost and a supported browser. Upload a photo or try the device camera below.',
      );
      return;
    }
    const request = ++generation.current;
    setCamera('opening');
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });
      if (generation.current !== request) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      for (const track of media.getTracks())
        track.onended = () => {
          stopCamera();
          setError('The camera stopped. Try again or upload a photo.');
        };
      setCamera('live');
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
    } catch (error) {
      if (generation.current !== request) return;
      stopCamera();
      const denied = error instanceof DOMException && error.name === 'NotAllowedError';
      setError(
        denied
          ? 'Camera permission was not granted. Allow camera access in your browser settings, or upload a photo.'
          : 'The camera could not be opened. It may be unavailable or in use. Upload a photo or try again.',
      );
    }
  }
  function capture() {
    try {
      const frame = video.current!;
      const encoded = encodePhoto(frame, frame.videoWidth, frame.videoHeight);
      setPhotos((list) => [...list, encoded].slice(0, MAX_PHOTOS));
      setError('');
      stopCamera();
      cameraButton.current?.focus();
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function choose(files: File[]) {
    if (!files.length) return;
    stopCamera();
    const request = ++generation.current;
    setError('');
    setProcessing(true);
    try {
      if (files.length > MAX_PHOTOS - photos.length)
        setError(`Only ${MAX_PHOTOS} photos fit; the first ones you chose were added.`);
      for (const file of files.slice(0, MAX_PHOTOS - photos.length)) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
          throw new Error('Choose a PNG, JPEG, or WebP photo. Export HEIC photos as JPEG first.');
        if (file.size > 20000000) throw new Error('Choose an image smaller than 20 MB.');
        const bitmap = await createImageBitmap(file);
        try {
          if (generation.current !== request) return;
          const encoded = encodePhoto(bitmap, bitmap.width, bitmap.height);
          setPhotos((list) => [...list, encoded].slice(0, MAX_PHOTOS));
        } finally {
          bitmap.close();
        }
      }
    } catch (error) {
      if (generation.current === request)
        setError(
          error instanceof Error ? error.message : 'Could not read this image. Try another photo.',
        );
    } finally {
      if (generation.current === request) setProcessing(false);
    }
  }

  return (
    <section className="question-photo" aria-labelledby="question-photo-title">
      <h3 id="question-photo-title">Add photos</h3>
      <p className="form-hint">
        Up to {MAX_PHOTOS} photos showing the issue or error message. Hide passwords, faces, and
        personal details. Photos become public only if your question is approved.
      </p>
      {photos.map((data, i) => (
        <input key={i} type="hidden" name={'photo' + i} value={data} />
      ))}
      <input
        ref={upload}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-label="Choose question photos"
        multiple
        hidden
        onChange={(event) => {
          void choose([...(event.target.files || [])]);
          event.target.value = '';
        }}
      />
      <input
        ref={nativeCamera}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        capture="environment"
        aria-label="Take photo with device camera"
        hidden
        onChange={(event) => {
          void choose([...(event.target.files || [])]);
          event.target.value = '';
        }}
      />
      <div className="button-row">
        <button
          type="button"
          className="button secondary small"
          disabled={processing || camera !== 'off' || full}
          onClick={() => upload.current?.click()}
        >
          <ImageSquare size={18} />
          {photos.length ? 'Upload more photos' : 'Upload photos'}
        </button>
        <button
          ref={cameraButton}
          type="button"
          className="button secondary small"
          disabled={processing || camera !== 'off' || full}
          onClick={openCamera}
        >
          <Camera size={18} />
          {photos.length ? 'Take another photo' : 'Take a photo'}
        </button>
      </div>
      {processing && <p role="status">Preparing your photo…</p>}
      {camera !== 'off' && (
        <div className="question-camera">
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            aria-label="Live camera preview"
            onCanPlay={() => setReady(true)}
          />
          <p role="status">
            {camera === 'opening'
              ? 'Waiting for camera permission…'
              : 'Frame the issue, then capture your photo.'}
          </p>
          <div className="button-row">
            <button
              type="button"
              className="button primary small"
              disabled={!ready}
              onClick={capture}
            >
              <Camera size={18} />
              Capture photo
            </button>
            <button
              type="button"
              className="button secondary small"
              onClick={() => {
                stopCamera();
                cameraButton.current?.focus();
              }}
            >
              Cancel camera
            </button>
          </div>
        </div>
      )}
      {!!photos.length && camera === 'off' && (
        <ul className="question-photo-previews">
          {photos.map((data, i) => (
            <li key={i}>
              <figure className="question-photo-preview">
                <img src={data} alt={`Selected photo ${i + 1} of ${photos.length}`} />
                <figcaption>
                  Photo {i + 1} of {photos.length}
                  <button
                    type="button"
                    className="text-button"
                    disabled={processing}
                    onClick={() => {
                      setPhotos((list) => list.filter((_, index) => index !== i));
                      setError('');
                    }}
                  >
                    <Trash size={16} /> Remove
                  </button>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <div className="photo-error">
          <p className="field-error" role="alert">
            {error}
          </p>
          <button
            type="button"
            className="text-button"
            disabled={processing || camera !== 'off'}
            onClick={() => nativeCamera.current?.click()}
          >
            Open device camera / photo picker
          </button>
        </div>
      )}
      <p className="form-hint">
        {full
          ? `You have added the maximum of ${MAX_PHOTOS} photos. Remove one to add another.`
          : 'PNG, JPEG, or WebP images, up to 20 MB each before resizing. Photos are resized for upload, and nothing is uploaded until you submit.'}
      </p>
    </section>
  );
}

// Shows every photo of a question (photos: list or JSON string), or a single photo.
export function QuestionImage({
  photo,
  photos,
  title,
}: {
  photo?: string;
  photos?: string[] | string;
  title: string;
}) {
  const parsed: string[] = typeof photos === 'string' ? JSON.parse(photos || '[]') : photos || [];
  const list = parsed.length ? parsed : photo ? [photo] : [];
  if (!list.length) return null;
  return (
    <div className={list.length > 1 ? 'question-images' : undefined}>
      {list.map((url, i) => (
        <a
          key={url}
          className="question-image"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open photo ${i + 1} of ${list.length} for ${title} in a new tab`}
        >
          <img src={url} alt={`Photo ${i + 1} attached to: ${title}`} loading="lazy" />
          <span className="photo-zoom" aria-hidden="true">
            <MagnifyingGlassPlus size={18} />
          </span>
        </a>
      ))}
    </div>
  );
}
