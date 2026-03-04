#pragma once

#include "CoreMinimal.h"
#include "MCSettingsData.generated.h"

/**
 * Audio settings stub for PM3 settings persistence.
 */
USTRUCT(BlueprintType)
struct FMCSettingsAudioData
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings|Audio")
	float MasterVolume = 1.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings|Audio")
	float MusicVolume = 0.8f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings|Audio")
	float SfxVolume = 0.85f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings|Audio")
	bool bMuteAll = false;
};

/**
 * Display settings stub for PM3 settings persistence.
 */
USTRUCT(BlueprintType)
struct FMCSettingsDisplayData
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings|Display")
	int32 DisplayModeIndex = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings|Display")
	int32 ResolutionScalePercent = 100;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings|Display")
	float BrightnessGamma = 2.2f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings|Display")
	bool bVSyncEnabled = true;
};

/**
 * Controls settings stub for PM3 settings persistence.
 */
USTRUCT(BlueprintType)
struct FMCSettingsControlsData
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings|Controls")
	float MouseSensitivity = 1.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings|Controls")
	bool bInvertYAxis = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings|Controls")
	bool bControllerVibrationEnabled = true;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings|Controls")
	int32 GamepadLayoutIndex = 0;
};

/**
 * Persisted player settings payload.
 */
USTRUCT(BlueprintType)
struct FMCPlayerSettingsData
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings")
	int32 SettingsSchemaVersion = 1;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings")
	FMCSettingsAudioData Audio;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings")
	FMCSettingsDisplayData Display;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings")
	FMCSettingsControlsData Controls;
};
