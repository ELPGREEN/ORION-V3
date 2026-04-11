package app.lovable.fc2105d766374b26bdec2c651f69d311;

import android.Manifest;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.ImageFormat;
import android.graphics.YuvImage;
import android.hardware.camera2.*;
import android.media.Image;
import android.media.ImageReader;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Base64;
import android.view.Surface;

import com.getcapacitor.*;
import com.getcapacitor.annotation.*;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;

@CapacitorPlugin(
    name = "CameraStreamPlugin",
    permissions = {
        @Permission(strings = { Manifest.permission.CAMERA }, alias = "camera")
    }
)
public class CameraStreamPlugin extends Plugin {

    private CameraDevice cameraDevice;
    private CameraCaptureSession captureSession;
    private ImageReader imageReader;
    private HandlerThread backgroundThread;
    private Handler backgroundHandler;
    private boolean isStreaming = false;
    private String currentFacing = "back";
    private int quality = 70;
    private int frameWidth = 640;
    private int frameHeight = 480;

    @PluginMethod
    public void startStream(PluginCall call) {
        quality = call.getInt("quality", 70);
        frameWidth = call.getInt("width", 640);
        frameHeight = call.getInt("height", 480);
        currentFacing = call.getString("facing", "back");

        if (!getPermissionState("camera").equals("granted")) {
            requestPermissionForAlias("camera", call, "handleCameraPermission");
            return;
        }

        startBackgroundThread();
        openCamera(call);
    }

    @PluginMethod
    public void stopStream(PluginCall call) {
        closeCamera();
        call.resolve();
    }

    @PluginMethod
    public void captureFrame(PluginCall call) {
        if (!isStreaming || imageReader == null) {
            call.reject("Camera not streaming");
            return;
        }
        // Frame will be captured from the next available image
        Image image = imageReader.acquireLatestImage();
        if (image == null) {
            call.reject("No frame available");
            return;
        }

        String base64 = imageToBase64(image, quality);
        image.close();

        JSObject result = new JSObject();
        result.put("base64", base64);
        result.put("width", frameWidth);
        result.put("height", frameHeight);
        result.put("timestamp", System.currentTimeMillis());
        result.put("format", "jpeg");
        call.resolve(result);
    }

    @PluginMethod
    public void switchCamera(PluginCall call) {
        currentFacing = "front".equals(currentFacing) ? "back" : "front";
        closeCamera();
        startBackgroundThread();
        openCamera(call);
        JSObject result = new JSObject();
        result.put("facing", currentFacing);
        call.resolve(result);
    }

    @PluginMethod
    public void isStreaming(PluginCall call) {
        JSObject result = new JSObject();
        result.put("streaming", isStreaming);
        call.resolve(result);
    }

    @PermissionCallback
    private void handleCameraPermission(PluginCall call) {
        if (getPermissionState("camera").equals("granted")) {
            startBackgroundThread();
            openCamera(call);
        } else {
            call.reject("Camera permission denied");
        }
    }

    private void openCamera(PluginCall call) {
        try {
            CameraManager manager = (CameraManager) getContext().getSystemService(android.content.Context.CAMERA_SERVICE);
            String cameraId = getCameraId(manager);

            imageReader = ImageReader.newInstance(frameWidth, frameHeight, ImageFormat.JPEG, 2);
            imageReader.setOnImageAvailableListener(reader -> {
                Image image = reader.acquireLatestImage();
                if (image != null) {
                    String base64 = imageToBase64(image, quality);
                    image.close();

                    JSObject frame = new JSObject();
                    frame.put("base64", base64);
                    frame.put("width", frameWidth);
                    frame.put("height", frameHeight);
                    frame.put("timestamp", System.currentTimeMillis());
                    frame.put("format", "jpeg");
                    notifyListeners("frame", frame);
                }
            }, backgroundHandler);

            manager.openCamera(cameraId, new CameraDevice.StateCallback() {
                @Override
                public void onOpened(CameraDevice camera) {
                    cameraDevice = camera;
                    createCaptureSession(call);
                }

                @Override
                public void onDisconnected(CameraDevice camera) {
                    camera.close();
                    cameraDevice = null;
                    isStreaming = false;
                }

                @Override
                public void onError(CameraDevice camera, int error) {
                    camera.close();
                    cameraDevice = null;
                    isStreaming = false;
                    call.reject("Camera error: " + error);
                }
            }, backgroundHandler);

        } catch (Exception e) {
            call.reject("Failed to open camera: " + e.getMessage());
        }
    }

    private void createCaptureSession(PluginCall call) {
        try {
            Surface surface = imageReader.getSurface();
            CaptureRequest.Builder builder = cameraDevice.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
            builder.addTarget(surface);
            builder.set(CaptureRequest.CONTROL_MODE, CameraMetadata.CONTROL_MODE_AUTO);

            cameraDevice.createCaptureSession(
                java.util.Collections.singletonList(surface),
                new CameraCaptureSession.StateCallback() {
                    @Override
                    public void onConfigured(CameraCaptureSession session) {
                        captureSession = session;
                        isStreaming = true;
                        try {
                            session.setRepeatingRequest(builder.build(), null, backgroundHandler);
                        } catch (Exception e) {
                            call.reject("Capture failed: " + e.getMessage());
                            return;
                        }
                        call.resolve();
                    }

                    @Override
                    public void onConfigureFailed(CameraCaptureSession session) {
                        call.reject("Camera configuration failed");
                    }
                },
                backgroundHandler
            );
        } catch (Exception e) {
            call.reject("Session creation failed: " + e.getMessage());
        }
    }

    private String getCameraId(CameraManager manager) throws Exception {
        int facing = "front".equals(currentFacing)
            ? CameraCharacteristics.LENS_FACING_FRONT
            : CameraCharacteristics.LENS_FACING_BACK;

        for (String id : manager.getCameraIdList()) {
            CameraCharacteristics chars = manager.getCameraCharacteristics(id);
            Integer lensFacing = chars.get(CameraCharacteristics.LENS_FACING);
            if (lensFacing != null && lensFacing == facing) return id;
        }
        return manager.getCameraIdList()[0];
    }

    private String imageToBase64(Image image, int quality) {
        ByteBuffer buffer = image.getPlanes()[0].getBuffer();
        byte[] bytes = new byte[buffer.remaining()];
        buffer.get(bytes);

        Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        if (bitmap == null) return "";

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, quality, baos);
        bitmap.recycle();
        return Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
    }

    private void startBackgroundThread() {
        backgroundThread = new HandlerThread("CameraStream");
        backgroundThread.start();
        backgroundHandler = new Handler(backgroundThread.getLooper());
    }

    private void closeCamera() {
        isStreaming = false;
        try { if (captureSession != null) { captureSession.close(); captureSession = null; } } catch (Exception ignored) {}
        try { if (cameraDevice != null) { cameraDevice.close(); cameraDevice = null; } } catch (Exception ignored) {}
        try { if (imageReader != null) { imageReader.close(); imageReader = null; } } catch (Exception ignored) {}
        try { if (backgroundThread != null) { backgroundThread.quitSafely(); backgroundThread = null; } } catch (Exception ignored) {}
    }

    @Override
    protected void handleOnDestroy() {
        closeCamera();
        super.handleOnDestroy();
    }
}
