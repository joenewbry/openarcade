#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "MCMenuPlayerController.generated.h"

class UMCMenuRootWidget;

/**
 * Spawns the menu root widget and enables UI-focused input on startup.
 */
UCLASS()
class MOBCLASH_API AMCMenuPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	virtual void BeginPlay() override;

protected:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Menu")
	TSubclassOf<UMCMenuRootWidget> MenuRootWidgetClass;

	UPROPERTY(Transient)
	TObjectPtr<UMCMenuRootWidget> MenuRootWidget;
};
